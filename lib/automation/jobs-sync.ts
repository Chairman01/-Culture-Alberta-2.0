/**
 * Jobs sync orchestrator: Adzuna → values filter → Supabase upsert → expiry.
 *
 * Runs daily via /api/cron/sync-jobs (see vercel.json) or the admin trigger.
 * Slugs are generated ONCE at insert and never regenerated on upsert —
 * slug churn would reset each posting page's SEO.
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { fetchAdzunaJobs, fetchFixtureJobs } from './adzuna'
import { filterJobs } from './jobs-filter'
import { JOB_CITIES, buildJobSlug } from '@/lib/jobs'
import { JobCity, JobUpsertRow } from '@/lib/types/job'

// Adzuna rows absent from the feed for this many days get expired
const STALE_AFTER_DAYS = 3

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Service role key for server-side writes — bypasses RLS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export interface JobsSyncResult {
  city: JobCity
  fetched: number
  blocked: number
  inserted: number
  updated: number
  expiredStale: number
  expiredPastDue: number
  errors: string[]
}

export async function syncJobsForCity(city: JobCity, useFixture = false): Promise<JobsSyncResult> {
  const result: JobsSyncResult = {
    city, fetched: 0, blocked: 0, inserted: 0, updated: 0,
    expiredStale: 0, expiredPastDue: 0, errors: [],
  }

  const supabase = getSupabaseAdmin()

  // 1. Fetch
  const fetched = useFixture ? await fetchFixtureJobs(city) : await fetchAdzunaJobs(city)
  result.fetched = fetched.length

  if (fetched.length === 0) {
    // Empty fetch = API failure or missing keys. Do NOT expire existing rows
    // off the back of a failed fetch — report and stop.
    result.errors.push('Fetch returned 0 jobs (missing keys or API failure) — skipped upsert and stale-expiry')
    return result
  }

  // 2. Values filter
  const { kept, blocked } = filterJobs(fetched)
  result.blocked = blocked.length

  // 3. Upsert: update existing rows (never the slug), insert new ones
  const sourceIds = kept.map(r => r.source_id)
  const { data: existingRows, error: existingErr } = await supabase
    .from('jobs')
    .select('source_id')
    .eq('source', 'adzuna')
    .in('source_id', sourceIds)

  if (existingErr) {
    result.errors.push(`Lookup failed: ${existingErr.message}`)
    return result
  }

  const existing = new Set((existingRows ?? []).map(r => r.source_id as string))
  const nowIso = new Date().toISOString()

  const toUpdate = kept.filter(r => existing.has(r.source_id))
  const toInsert = kept.filter(r => !existing.has(r.source_id))

  for (const row of toUpdate) {
    const { error } = await supabase
      .from('jobs')
      .update({
        title: row.title,
        company: row.company,
        category: row.category,
        location_raw: row.location_raw,
        description_snippet: row.description_snippet,
        salary_min: row.salary_min,
        salary_max: row.salary_max,
        salary_label: row.salary_label,
        employment_type: row.employment_type,
        apply_url: row.apply_url,
        source_url: row.source_url,
        valid_through: row.valid_through,
        last_seen_at: nowIso,
        status: 'active',
      })
      .eq('source', 'adzuna')
      .eq('source_id', row.source_id)
    if (error) result.errors.push(`Update ${row.source_id}: ${error.message}`)
    else result.updated++
  }

  if (toInsert.length > 0) {
    const insertRows = toInsert.map(row => ({
      ...row,
      slug: buildJobSlug(row.title, row.company),
      last_seen_at: nowIso,
      status: 'active',
      is_manual: false,
      is_featured: false,
    }))
    const { error } = await supabase.from('jobs').insert(insertRows)
    if (error) result.errors.push(`Insert failed: ${error.message}`)
    else result.inserted = insertRows.length
  }

  // 4. Expire: stale (absent from feed > N days) and past valid_through
  const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleRows, error: staleErr } = await supabase
    .from('jobs')
    .update({ status: 'expired' })
    .eq('source', 'adzuna')
    .eq('city', city)
    .eq('status', 'active')
    .lt('last_seen_at', staleCutoff)
    .select('id')
  if (staleErr) result.errors.push(`Stale expiry failed: ${staleErr.message}`)
  else result.expiredStale = staleRows?.length ?? 0

  const { data: pastDueRows, error: pastDueErr } = await supabase
    .from('jobs')
    .update({ status: 'expired' })
    .eq('city', city)
    .eq('status', 'active')
    .lt('valid_through', nowIso)
    .select('id')
  if (pastDueErr) result.errors.push(`Past-due expiry failed: ${pastDueErr.message}`)
  else result.expiredPastDue = pastDueRows?.length ?? 0

  return result
}

export async function syncAllJobs(useFixture = false): Promise<JobsSyncResult[]> {
  const results: JobsSyncResult[] = []
  for (const city of JOB_CITIES) {
    try {
      results.push(await syncJobsForCity(city, useFixture))
    } catch (err) {
      results.push({
        city, fetched: 0, blocked: 0, inserted: 0, updated: 0,
        expiredStale: 0, expiredPastDue: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      })
    }
  }

  // Refresh the jobs pages once per run
  try {
    revalidatePath('/jobs')
    for (const city of JOB_CITIES) revalidatePath(`/jobs/${city}`)
  } catch {
    // revalidatePath throws outside a request scope in some contexts — non-fatal
  }

  return results
}
