/**
 * Pinterest backfill — pin recent articles on demand.
 *
 * GET shows the recent published articles that would be pinned (the same
 * filter as automatic Pins) and a form to choose the default board. Nothing is
 * posted by GET.
 *
 * POST, sent only by pressing the button on that page, creates the Pins,
 * oldest first so the newest story ends up on top of the board. City boards
 * still win over the chosen default, exactly as for automatic Pins.
 *
 * Each Pin that succeeds is recorded in social_posts, so the automatic poster
 * will never pin that article again. A failure is NOT recorded: on Trial
 * access every Pin is refused, and recording those would burn the article's
 * retry attempts before Standard access arrives. Two failures in a row stop
 * the run, since the rest would fail for the same reason.
 *
 * Admin-only. POST also requires a same-origin request, so a link or form on
 * another site cannot trigger it with the admin's cookie.
 *
 *   GET  /api/pinterest/backfill
 *   POST /api/pinterest/backfill   (form: board, count)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import type { SocialArticle } from '@/lib/social'
import { getPinterestToken } from '@/lib/social/pinterest-tokens'
import { listBoards, pinSkipReason, postToPinterest, type PinterestBoard } from '@/lib/social/pinterest'

export const dynamic = 'force-dynamic'
// Each Pin renders and warms its card before Pinterest fetches it.
export const maxDuration = 300

const SITE = 'https://www.culturealberta.com'
const MAX_COUNT = 30
// Leave room to write the results page before the function is cut off.
const TIME_BUDGET_MS = 270_000

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  body{font:15px/1.55 system-ui,sans-serif;margin:0;padding:24px 16px;color:#111;background:#f6f6f4}
  main{max-width:960px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .note{color:#5f5e5a;margin:0 0 16px}
  form{background:#fff;border-radius:12px;padding:16px;margin:0 0 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:end}
  label{display:flex;flex-direction:column;font-size:13px;color:#5f5e5a;gap:4px}
  select,input{font:inherit;padding:8px 10px;border:1px solid #ccc;border-radius:8px}
  button{font:inherit;font-weight:700;background:#e60023;color:#fff;border:0;border-radius:999px;padding:10px 20px;cursor:pointer}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
  td,th{padding:9px 12px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5f5e5a}
  .ok{color:#166534;font-weight:600}.bad{color:#991b1b;font-weight:600}.muted{color:#5f5e5a}
  small{color:#5f5e5a}
  a{color:#0b57d0}
</style></head><body><main>${body}</main></body></html>`
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

type Row = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  image_url: string | null
  category: string | null
  tags: string[] | null
}

const toSocial = (a: Row): SocialArticle => ({
  id: a.id,
  title: a.title,
  slug: a.slug,
  excerpt: a.excerpt,
  imageUrl: a.image_url,
  category: a.category,
  tags: a.tags,
})

/** Recent published articles that pass the filter and were never pinned. */
async function candidates(limit: number): Promise<{ pin: Row[]; skipped: { row: Row; why: string }[] }> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, category, tags')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as Row[]
  const { data: done } = await supabase
    .from('social_posts')
    .select('article_id')
    .eq('platform', 'pinterest')
    .eq('status', 'posted')
    .in('article_id', rows.map((r) => r.id))
  const pinned = new Set((done ?? []).map((d) => d.article_id))

  const pin: Row[] = []
  const skipped: { row: Row; why: string }[] = []
  for (const row of rows) {
    if (pinned.has(row.id)) {
      skipped.push({ row, why: 'already pinned' })
      continue
    }
    const why = pinSkipReason(toSocial(row))
    if (why) skipped.push({ row, why })
    else pin.push(row)
  }
  return { pin, skipped }
}

async function boardsOrError(): Promise<{ boards: PinterestBoard[]; error?: string }> {
  const token = await getPinterestToken()
  if (!token) return { boards: [], error: 'Pinterest is not connected. Visit /api/pinterest/connect first.' }
  try {
    return { boards: await listBoards(token, { fresh: true }) }
  } catch (err) {
    return { boards: [], error: String(err).slice(0, 300) }
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const [{ pin, skipped }, { boards, error }] = await Promise.all([candidates(MAX_COUNT), boardsOrError()])

  if (error) return page('Pinterest backfill', `<h1>Pinterest backfill</h1><p class="bad">${esc(error)}</p>`)

  const preferred = process.env.PINTEREST_BOARD_ID ?? boards.find((b) => /^alberta/i.test(b.name))?.id
  const options = boards
    .map((b) => `<option value="${esc(b.id)}"${b.id === preferred ? ' selected' : ''}>${esc(b.name)}</option>`)
    .join('')

  const list = [
    ...pin.map(
      (r) => `<tr><td class="ok">Pin</td><td>${esc(r.title)}</td><td>${esc(r.category ?? '')}</td></tr>`
    ),
    ...skipped.map(
      ({ row, why }) =>
        `<tr><td class="muted">Skip</td><td>${esc(row.title)}<br><small>${esc(why)}</small></td><td>${esc(row.category ?? '')}</td></tr>`
    ),
  ].join('')

  return page(
    'Pinterest backfill',
    `<h1>Pinterest backfill</h1>
     <p class="note">Of the ${MAX_COUNT} newest articles, <b>${pin.length}</b> would be pinned. Edmonton and Calgary stories go to their city boards; the rest go to the board you pick. Nothing is posted until you press the button.</p>
     <form method="post">
       <label>Default board<select name="board">${options}</select></label>
       <label>How many<input type="number" name="count" min="1" max="${pin.length}" value="${pin.length}"></label>
       <button type="submit">Pin ${pin.length} articles</button>
     </form>
     <table><tr><th></th><th>Article</th><th>Category</th></tr>${list}</table>`
  )
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  // The admin cookie rides along on any request to this site, so require the
  // form to have been submitted from this site.
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return page('Refused', '<h1>Refused</h1><p>Submit this from the backfill page on this site.</p>', 403)
  }

  const form = await request.formData()
  const boardId = String(form.get('board') ?? '').trim()
  const count = Math.min(MAX_COUNT, Math.max(1, Number(form.get('count')) || 1))

  const { boards, error } = await boardsOrError()
  if (error) return page('Pinterest backfill', `<h1>Pinterest backfill</h1><p class="bad">${esc(error)}</p>`, 400)
  if (!boards.some((b) => b.id === boardId)) {
    return page('Pinterest backfill', '<h1>Pick a board from the list</h1><p><a href="">Back</a></p>', 400)
  }

  // Oldest first, so the newest story lands on top of the board.
  const { pin } = await candidates(MAX_COUNT)
  const batch = pin.slice(0, count).reverse()

  const supabase = getServiceClient()
  const started = Date.now()
  const results: { row: Row; ok: boolean; detail: string }[] = []
  let failuresInARow = 0
  let stopped = ''

  for (const row of batch) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      stopped = 'Stopped to stay inside the time limit. Run it again to pin the rest; finished ones are skipped.'
      break
    }
    if (failuresInARow >= 2) {
      stopped = 'Stopped after two failures in a row; the rest would fail the same way.'
      break
    }

    try {
      const url = await postToPinterest(toSocial(row), `${SITE}/articles/${row.slug}`, {
        defaultBoardId: boardId,
      })
      await supabase
        .from('social_posts')
        .upsert(
          { article_id: row.id, platform: 'pinterest', status: 'posted', external_url: url ?? null, error: null },
          { onConflict: 'article_id,platform' }
        )
      results.push({ row, ok: true, detail: url ?? 'posted' })
      failuresInARow = 0
    } catch (err) {
      results.push({ row, ok: false, detail: String(err).slice(0, 400) })
      failuresInARow++
    }
  }

  const okCount = results.filter((r) => r.ok).length
  const rows = results
    .map(
      (r) => `<tr><td class="${r.ok ? 'ok' : 'bad'}">${r.ok ? 'Pinned' : 'Failed'}</td>
        <td>${esc(r.row.title)}<br><small>${
          r.ok ? `<a href="${esc(r.detail)}" target="_blank" rel="noopener">${esc(r.detail)}</a>` : esc(r.detail)
        }</small></td></tr>`
    )
    .join('')

  return page(
    'Pinterest backfill results',
    `<h1>${okCount} of ${results.length} pinned</h1>
     ${stopped ? `<p class="note">${esc(stopped)}</p>` : ''}
     <p class="note"><a href="">Back to the backfill page</a></p>
     <table><tr><th></th><th>Article</th></tr>${rows}</table>`
  )
}
