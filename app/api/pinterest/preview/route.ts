/**
 * Pinterest dry run — read-only.
 *
 * Shows exactly what the autopin pipeline would send for an article: the card
 * image, title, description, alt text, link and board, or why the article
 * would be skipped. Nothing is posted from here; it never calls Pinterest's
 * create-Pin endpoint. It reads the board list when the account is connected,
 * so the board shown is the one the real Pin would land on.
 *
 * Admin-only, like the status page.
 *
 *   GET /api/pinterest/preview            the 30 most recent published articles
 *   GET /api/pinterest/preview?slug=...   one article, in full
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import type { SocialArticle } from '@/lib/social'
import { getPinterestToken } from '@/lib/social/pinterest-tokens'
import {
  buildPin,
  listBoards,
  matchCityBoard,
  pinImageUrl,
  pinSkipReason,
  type PinterestBoard,
} from '@/lib/social/pinterest'

export const dynamic = 'force-dynamic'

const SITE = 'https://www.culturealberta.com'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(title: string, body: string): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  body{font:15px/1.55 system-ui,sans-serif;margin:0;padding:24px 16px;color:#111;background:#f6f6f4}
  main{max-width:960px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .note{color:#5f5e5a;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
  td,th{padding:10px 12px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5f5e5a}
  .pin{color:#166534;font-weight:600}.skip{color:#991b1b;font-weight:600}
  .grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:24px;background:#fff;border-radius:16px;padding:20px}
  .grid img{width:100%;border-radius:12px;display:block}
  dl{margin:0}dt{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5f5e5a;margin-top:14px}
  dd{margin:4px 0 0;white-space:pre-line;word-break:break-word}
  .count{color:#5f5e5a;font-size:12px}
  a{color:#0b57d0}
  @media (max-width:700px){.grid{grid-template-columns:1fr}}
</style></head><body><main>${body}</main></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
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

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabase = getServiceClient()
  const slug = request.nextUrl.searchParams.get('slug')
  const fields = 'id, title, slug, excerpt, image_url, category, tags'

  if (!slug) {
    const { data } = await supabase
      .from('articles')
      .select(fields)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30)

    const rows = ((data ?? []) as Row[])
      .map((a) => {
        const reason = pinSkipReason(toSocial(a))
        return `<tr>
          <td>${reason ? '<span class="skip">Skip</span>' : '<span class="pin">Pin</span>'}</td>
          <td><a href="?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a>
            ${reason ? `<div class="count">${esc(reason)}</div>` : ''}</td>
          <td>${esc(a.category ?? '')}</td>
        </tr>`
      })
      .join('')

    return page(
      'Pinterest dry run',
      `<h1>Pinterest dry run</h1>
       <p class="note">The 30 newest articles and whether each would be pinned. Open one to see the exact Pin. Nothing is posted from this page.</p>
       <table><tr><th>Would</th><th>Article</th><th>Category</th></tr>${rows}</table>`
    )
  }

  const { data: article } = await supabase
    .from('articles')
    .select(fields)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!article) return page('Not found', '<h1>No published article with that slug</h1><p><a href="?">Back to the list</a></p>')

  const social = toSocial(article as Row)
  const reason = pinSkipReason(social)
  const pin = buildPin(social)

  let board = process.env.PINTEREST_BOARD_ID
    ? `Default board (${esc(process.env.PINTEREST_BOARD_ID)})`
    : 'Default board — PINTEREST_BOARD_ID is not set yet'
  const token = await getPinterestToken()
  if (token) {
    try {
      const boards: PinterestBoard[] = await listBoards(token)
      const match = matchCityBoard(social, boards)
      if (match) board = `${esc(match.name)} (${esc(match.id)})`
      else {
        const fallback = boards.find((b) => b.id === process.env.PINTEREST_BOARD_ID)
        if (fallback) board = `${esc(fallback.name)} (${esc(fallback.id)}) — the default board`
      }
    } catch (err) {
      board += ` — board list unavailable: ${esc(String(err).slice(0, 200))}`
    }
  } else {
    board += ' — Pinterest is not connected, so city boards could not be checked'
  }

  const chars = (s: string) => [...s].length
  const articleUrl = `${SITE}/articles/${social.slug}`

  return page(
    `Pin: ${social.title}`,
    `<p><a href="?">&larr; All articles</a></p>
     <h1>${esc(social.title)}</h1>
     <p class="note">${
       reason
         ? `<span class="skip">This article would NOT be pinned:</span> ${esc(reason)}. It still goes to Bluesky and Threads.`
         : '<span class="pin">This article would be pinned</span> exactly as shown. Nothing is posted from this page.'
     }</p>
     <div class="grid">
       <img src="${esc(pinImageUrl(social.slug))}" alt="${esc(pin.alt_text)}">
       <dl>
         <dt>Title <span class="count">${chars(pin.title)}/100 · about the first 50 show in the feed</span></dt>
         <dd>${esc(pin.title)}</dd>
         <dt>Description <span class="count">${chars(pin.description)}/500</span></dt>
         <dd>${esc(pin.description)}</dd>
         <dt>Alt text <span class="count">${chars(pin.alt_text)}/500</span></dt>
         <dd>${esc(pin.alt_text)}</dd>
         <dt>Link</dt>
         <dd><a href="${esc(articleUrl)}">${esc(articleUrl)}</a></dd>
         <dt>Board</dt>
         <dd>${board}</dd>
       </dl>
     </div>`
  )
}
