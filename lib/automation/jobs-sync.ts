/**
 * Jobs sync: employers' own ATS boards → values filter → Supabase → expiry.
 *
 * Runs daily via /api/cron/sync-jobs (see vercel.json) or the admin trigger.
 * Slugs are generated ONCE at insert and never regenerated on upsert —
 * slug churn would reset each posting page's SEO.
 *
 * Replaced an aggregator feed in August 2026. Two things changed as a result:
 *
 *  1. Expiry is immediate rather than on a 3-day timer. The aggregator only
 *     ever showed us the first 150 results per city, so a missing job proved
 *     nothing. An ATS board is the employer's complete list, so absence IS the
 *     signal that a role closed — but only for boards that actually answered,
 *     hence the per-board bookkeeping below.
 *
 *  2. Rows carry full descriptions and an apply URL on the employer's own
 *     application form, which is what makes the pages indexable.
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { fetchAtsJobs, ATS_BOARDS } from './ats'
import { filterJobs } from './jobs-filter'
import { JOB_CITIES, buildJobSlug } from '@/lib/jobs'
import { JobCity, JobUpsertRow } from '@/lib/types/job'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Service role key for server-side writes — bypasses RLS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export interface JobsSyncResult {
  fetched: number
  blocked: number
  inserted: number
  updated: number
  expired: number
  byCity: Partial<Record<JobCity, number>>
  boards: Array<{ board: string; provider: string; alberta: number; error?: string }>
  errors: string[]
}

export async function syncAllJobs(): Promise<JobsSyncResult> {
  const result: JobsSyncResult = {
    fetched: 0, blocked: 0, inserted: 0, updated: 0, expired: 0,
    byCity: {}, boards: [], errors: [],
  }

  const supabase = getSupabaseAdmin()

  // 1. Fetch every configured board
  const { rows: fetched, boards } = await fetchAtsJobs()
  result.fetched = fetched.length
  result.boards = boards.map(b => ({ board: b.board, provider: b.provider, alberta: b.alberta, error: b.error }))

  const failedBoards = new Set(boards.filter(b => b.error).map(b => b.board))
  for (const b of boards.filter(b => b.error)) {
    result.errors.push(`${b.provider}/${b.board}: ${b.error}`)
  }

  if (fetched.length === 0) {
    // Every board failed, or the config is empty. Expiring here would wipe the
    // board off the back of an outage.
    result.errors.push('No jobs fetched from any board — skipped upsert and expiry')
    return result
  }

  // 2. Values filter (alcohol, gambling, cannabis, nightlife, adult)
  const { kept, blocked } = filterJobs(fetched)
  result.blocked = blocked.length

  for (const row of kept) {
    result.byCity[row.city] = (result.byCity[row.city] ?? 0) + 1
  }

  // 3. Upsert: update existing rows (never the slug), insert new ones
  const sourceIds = kept.map(r => r.source_id)
  const existing = new Set<string>()

  // Chunked: `in` with a thousand-plus ids overruns the URL length limit.
  for (let i = 0; i < sourceIds.length; i += 200) {
    const chunk = sourceIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('jobs')
      .select('source_id')
      .eq('source', 'ats')
      .in('source_id', chunk)
    if (error) {
      result.errors.push(`Lookup failed: ${error.message}`)
      return result
    }
    for (const r of data ?? []) existing.add(r.source_id as string)
  }

  const nowIso = new Date().toISOString()
  const toUpdate = kept.filter(r => existing.has(r.source_id))
  const toInsert = kept.filter(r => !existing.has(r.source_id))

  for (const row of toUpdate) {
    const { error } = await supabase
      .from('jobs')
      .update({
        title: row.title,
        company: row.company,
        location_raw: row.location_raw,
        description_snippet: row.description_snippet,
        description_html: row.description_html,
        employment_type: row.employment_type,
        // Both are re-read from the description each run, so a corrected
        // closing date or a newly published salary reaches rows that already
        // exist — not just newly inserted ones.
        valid_through: row.valid_through ?? null,
        salary_label: row.salary_label ?? null,
        apply_url: row.apply_url,
        source_url: row.source_url,
        last_seen_at: nowIso,
        status: 'active',
      })
      .eq('source', 'ats')
      .eq('source_id', row.source_id)
    if (error) result.errors.push(`Update ${row.source_id}: ${error.message}`)
    else result.updated++
  }

  if (toInsert.length > 0) {
    const insertRows = toInsert.map(row => ({
      ...row,
      slug: buildJobSlug(row.title, row.company),
      // Some employers publish no posting date at all — the City of Calgary
      // states one nowhere on the posting or in its own index, and Costco,
      // Mount Royal, MacEwan, Keyano, Wood Buffalo and Medicine Hat College are
      // the same. Leaving it null is truthful and useless: every listing sorts
      // by posted_at with nulls last, so a whole board lands past the end of a
      // 500-row page and is invisible. The City of Calgary's 72 openings went
      // straight to page 20-of-25 on the day they were added.
      //
      // First seen is the honest stand-in — this is only ever set on insert,
      // never on update, so it stays the date we actually first saw the role
      // and a posting that appears tomorrow sorts above one we found today.
      posted_at: row.posted_at ?? nowIso,
      last_seen_at: nowIso,
      status: 'active',
      is_manual: false,
      is_featured: false,
    }))
    // Chunked so one oversized request can't fail the whole batch.
    for (let i = 0; i < insertRows.length; i += 100) {
      const chunk = insertRows.slice(i, i + 100)
      const { error } = await supabase.from('jobs').insert(chunk)
      if (error) result.errors.push(`Insert failed: ${error.message}`)
      else result.inserted += chunk.length
    }
  }

  // 4. Expire anything that has left its board.
  //    Scoped per board and skipped for boards that errored — a timeout must
  //    never be read as "this employer closed every role".
  const seen = new Set(kept.map(r => r.source_id))
  for (const board of ATS_BOARDS) {
    if (failedBoards.has(board.token)) continue

    const { data: live, error: liveErr } = await supabase
      .from('jobs')
      .select('id, source_id')
      .eq('source', 'ats')
      .eq('ats_board', board.token)
      .eq('status', 'active')
    if (liveErr) {
      result.errors.push(`Expiry lookup ${board.token}: ${liveErr.message}`)
      continue
    }

    const gone = (live ?? []).filter(r => !seen.has(r.source_id as string)).map(r => r.id as string)
    if (gone.length === 0) continue

    const { error: expErr } = await supabase
      .from('jobs')
      .update({ status: 'expired' })
      .in('id', gone)
    if (expErr) result.errors.push(`Expiry ${board.token}: ${expErr.message}`)
    else result.expired += gone.length
  }

  // 5. Refresh the jobs pages once per run
  try {
    revalidatePath('/jobs')
    for (const city of JOB_CITIES) revalidatePath(`/jobs/${city}`)
  } catch {
    // revalidatePath throws outside a request scope in some contexts — non-fatal
  }

  return result
}
