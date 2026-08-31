/**
 * IndexNow sweeper.
 *
 * Submits any publicly visible URL that has not reached IndexNow yet, and
 * stamps `indexnow_submitted_at` so it is not submitted twice.
 *
 * This exists because per-publish pings kept missing content. Bing reported
 * seven unsubmitted URLs on 2026-08-31, from two different holes:
 *
 *   - Job postings were never submitted at all. notifySearchEngines() is wired
 *     into the article and event admin routes only; the daily ATS sync writes
 *     straight to the jobs table and pings nothing.
 *   - Articles inserted directly into the database — how most of them are
 *     written here — never touch /api/admin/articles/create, which is where the
 *     article ping lives.
 *
 * Adding a ping to each new write path would keep losing this race, so the
 * sweeper works off row state instead: whatever is published and unstamped gets
 * submitted, no matter how it got there. The existing per-publish pings stay as
 * the fast path so an admin publish still reaches Bing within minutes.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET) — see lib/cron-auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isCronAuthorized } from '@/lib/cron-auth'
import { submitUrlsToIndexNow } from '@/lib/indexing'
import { isIndexableJob } from '@/lib/jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE_URL = 'https://www.culturealberta.com'

/**
 * URLs submitted per run. IndexNow accepts up to 10,000 per request, so this is
 * not a protocol limit — it keeps a one-off backlog (clearing the stamp on a
 * month of jobs queues ~1,400 URLs) draining over several nights instead of
 * arriving as a single burst.
 */
const PER_RUN_CAP = 400

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Service role: the sweeper writes the stamp back, which RLS blocks for anon.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'indexnow-sweep cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dryRun=1 reports what this run would send and changes nothing — no
  // submission, no stamps. The submitting path is otherwise impossible to
  // inspect without actually notifying Bing.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'

  const supabase = getSupabaseAdmin()
  const errors: string[] = []

  // Articles first: they are the content that actually earns, and a backlog of
  // job postings should never push a new article past the cap.
  const { data: articles, error: articleErr } = await supabase
    .from('articles')
    .select('id, slug')
    .eq('status', 'published')
    .is('indexnow_submitted_at', null)
    .not('slug', 'is', null)
    .order('created_at', { ascending: false })
    .limit(PER_RUN_CAP)
  if (articleErr) errors.push(`Article lookup: ${articleErr.message}`)

  const articleRows = (articles ?? []) as Array<{ id: string; slug: string }>
  const jobBudget = Math.max(0, PER_RUN_CAP - articleRows.length)

  // Not every active posting is offered to search engines. isIndexableJob is
  // the policy — Cadient rows are rolling candidate pools rather than
  // vacancies, and anything past its valid_through has closed — and the posting
  // page renders `noindex` for both. Submitting those to IndexNow would ask
  // Bing to crawl pages we then tell it not to index, which is exactly the
  // "Excluded by 'noindex' tag" bucket that already holds 536 job URLs.
  //
  // The rules live in isIndexableJob and are not restated here; only the cheap
  // half (is a description present) is pushed into SQL, so the ~7.5KB of
  // description per row is never transferred. Same split the sitemap uses.
  let jobRows: Array<{ id: string; slug: string }> = []
  let skippedJobIds: string[] = []
  if (jobBudget > 0) {
    const { data: jobs, error: jobErr } = await supabase
      .from('jobs')
      .select('id, slug, source, ats_provider, status, valid_through')
      .eq('status', 'active')
      .is('indexnow_submitted_at', null)
      .not('slug', 'is', null)
      .not('description_html', 'is', null)
      .order('created_at', { ascending: false })
      // Over-fetch: roughly a tenth of active postings are non-indexable, and
      // without headroom a run could fill its whole budget with rows it then
      // discards and submit nothing.
      .limit(jobBudget * 2)
    if (jobErr) errors.push(`Job lookup: ${jobErr.message}`)

    const candidates = (jobs ?? []) as Array<
      { id: string; slug: string; source: string; ats_provider: string | null
        status: string; valid_through: string | null }
    >
    const eligible: typeof candidates = []
    for (const row of candidates) {
      // description_html is proven present by the SQL filter above; re-attaching
      // a placeholder keeps isIndexableJob the single place the rules live.
      if (isIndexableJob({ ...row, description_html: 'present' } as never)) eligible.push(row)
      else skippedJobIds.push(row.id)
    }
    jobRows = eligible.slice(0, jobBudget).map(r => ({ id: r.id, slug: r.slug }))
  }

  const stamp = async (table: 'articles' | 'jobs', ids: string[], at: string) => {
    if (dryRun || ids.length === 0) return
    // Chunked to keep the `in` list off Supabase's URL length limit.
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await supabase
        .from(table)
        .update({ indexnow_submitted_at: at })
        .in('id', ids.slice(i, i + 100))
      if (error) errors.push(`Stamp ${table}: ${error.message}`)
    }
  }

  // Rows rejected above are stamped as handled even though nothing was sent for
  // them. Nothing about a Cadient pool or a closed posting will ever become
  // indexable, so leaving them unstamped would mean re-reading the same
  // permanently-ineligible rows on every run, forever, and starving the
  // over-fetch of real candidates as they accumulated.
  await stamp('jobs', skippedJobIds, new Date().toISOString())

  const urls = [
    ...articleRows.map(a => `${BASE_URL}/articles/${a.slug}`),
    ...jobRows.map(j => `${BASE_URL}/jobs/posting/${j.slug}`),
  ]

  if (urls.length === 0) {
    return NextResponse.json({
      success: errors.length === 0,
      submitted: 0,
      skippedNonIndexable: skippedJobIds.length,
      message: 'Nothing pending',
      errors,
    })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSubmit: urls.length,
      articles: articleRows.length,
      jobs: jobRows.length,
      skippedNonIndexable: skippedJobIds.length,
      sample: urls.slice(0, 5),
      errors,
    })
  }

  const status = await submitUrlsToIndexNow(urls)
  const accepted = status === 200 || status === 202

  // Only stamp on an accepted submission. A 4xx from IndexNow (a bad key, a
  // host mismatch) must leave the rows pending so the next run retries them,
  // rather than marking a whole batch done that never actually landed.
  if (!accepted) {
    return NextResponse.json(
      {
        success: false,
        submitted: 0,
        attempted: urls.length,
        indexnowStatus: status,
        errors: [...errors, `IndexNow returned ${status ?? 'network error'} — rows left pending`],
      },
      { status: 502 }
    )
  }

  const stampedAt = new Date().toISOString()
  await stamp('articles', articleRows.map(a => a.id), stampedAt)
  await stamp('jobs', jobRows.map(j => j.id), stampedAt)

  console.log(
    `[indexnow-sweep] Submitted ${urls.length} URL(s) — ` +
    `${articleRows.length} article(s), ${jobRows.length} job(s), ` +
    `${skippedJobIds.length} non-indexable skipped, HTTP ${status}`
  )

  return NextResponse.json({
    success: errors.length === 0,
    submitted: urls.length,
    articles: articleRows.length,
    jobs: jobRows.length,
    skippedNonIndexable: skippedJobIds.length,
    indexnowStatus: status,
    errors,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
