/**
 * TikTok dry run — shows the exact carousel and caption an article would post
 * as, without posting. It calls Claude for the key facts (a fraction of a
 * cent), so it is admin-only and runs one article at a time.
 *
 *   GET /api/tiktok/preview                the 20 newest articles, Post or Skip
 *   GET /api/tiktok/preview?slug=<slug>    the carousel for one of them
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { pinSkipReason } from '@/lib/social/pinterest'
import { planTikTokPost } from '@/lib/social/tiktok'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  body{font:15px/1.55 system-ui,sans-serif;margin:0;padding:24px 16px;color:#111;background:#f4f4f2}
  main{max-width:1000px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}.note{color:#555;margin:0 0 16px}
  ul{background:#fff;border-radius:12px;padding:8px 16px 8px 32px}li{margin:6px 0}
  .slides{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px}
  .slides img{height:420px;border-radius:12px;flex:none;background:#222}
  .cap{background:#fff;border-radius:12px;padding:14px 16px;white-space:pre-wrap;margin-top:12px}
  .pin{color:#166534;font-weight:600}.skip{color:#991b1b;font-weight:600}.meta{font-size:13px;color:#555}a{color:#0b57d0}
</style></head><body><main>${body}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabase = getServiceClient()
  const slug = request.nextUrl.searchParams.get('slug')
  const fields = 'id, title, slug, excerpt, image_url, category, tags'

  if (!slug) {
    const { data } = await supabase.from('articles').select(fields).eq('status', 'published').order('created_at', { ascending: false }).limit(20)
    const items = (data ?? [])
      .map((a) => {
        const why = pinSkipReason({ id: a.id, title: a.title, slug: a.slug, tags: a.tags })
        return `<li>${why ? '<span class="skip">Skip</span>' : '<span class="pin">Post</span>'} <a href="?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a> <span class="meta">${esc(a.category ?? '')}${why ? ` — ${esc(why)}` : ''}</span></li>`
      })
      .join('')
    return page('TikTok dry run', `<h1>TikTok dry run</h1><p class="note">The 20 newest articles. Open one to see its carousel. Nothing is posted from this page.</p><ul>${items}</ul>`)
  }

  const { data: a } = await supabase.from('articles').select(fields).eq('slug', slug).eq('status', 'published').maybeSingle()
  if (!a) return page('Not found', '<h1>No published article with that slug</h1><p><a href="?">Back</a></p>')

  const article = { id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, imageUrl: a.image_url, category: a.category, tags: a.tags }
  const why = pinSkipReason(article)
  const plan = await planTikTokPost(article)

  return page(
    `TikTok: ${a.title}`,
    `<p><a href="?">&larr; All articles</a></p>
     <h1>${esc(a.title)}</h1>
     <p class="note">${why ? `<span class="skip">Would be skipped:</span> ${esc(why)}.` : '<span class="pin">Would be posted</span>'}
       · ${plan.slides.length} slides · posting via ${plan.provider === 'postfast' ? 'PostFast' : 'Buffer'} · music: <b>${esc(plan.music)}</b>${plan.soundSource === 'article' ? ' (picked for this article)' : plan.soundSource === 'default' ? ' (default sound)' : ''}
       · facts written by ${plan.bullets.source === 'claude' ? 'Claude' : 'the excerpt (fallback)'}${plan.bullets.note ? ` (${esc(plan.bullets.note)})` : ''}.
       Nothing is posted from this page.</p>
     <div class="slides">${plan.slides.map((s) => `<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div>
     <div class="meta" style="margin-top:12px">Title (bold, 90 max): ${esc(plan.title)}</div>
     <div class="cap">${esc(plan.caption)}</div>`
  )
}
