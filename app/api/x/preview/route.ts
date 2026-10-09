/**
 * X dry run — shows exactly what would be posted to X for an article, without
 * posting. It does call Claude to write the bullets (a fraction of a cent), so
 * it is admin-only and runs for one article at a time.
 *
 *   GET /api/x/preview                 the 20 newest articles
 *   GET /api/x/preview?slug=<slug>     the exact X post for one of them
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { planXPost } from '@/lib/social/x-buffer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE = 'https://www.culturealberta.com'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  body{font:15px/1.55 system-ui,sans-serif;margin:0;padding:24px 16px;color:#0f1419;background:#f7f9f9}
  main{max-width:620px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}.note{color:#536471;margin:0 0 16px}
  ul{background:#fff;border-radius:12px;padding:8px 16px 8px 32px}li{margin:6px 0}
  .tweet{background:#fff;border:1px solid #eff3f4;border-radius:16px;padding:14px 16px;margin:0 0 4px}
  .who{font-weight:700}.who span{color:#536471;font-weight:400}
  .text{white-space:pre-wrap;margin:6px 0 10px;word-break:break-word}
  .tweet img{width:100%;max-width:360px;border-radius:14px;border:1px solid #eff3f4;display:block}
  .reply{margin-left:28px;border-left:2px solid #cfd9de}
  .meta{font-size:13px;color:#536471}a{color:#1d9bf0}
</style></head><body><main>${body}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabase = getServiceClient()
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    const { data } = await supabase
      .from('articles')
      .select('title, slug, category')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)
    const items = (data ?? [])
      .map((a) => `<li><a href="?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a> <span class="meta">${esc(a.category ?? '')}</span></li>`)
      .join('')
    return page('X dry run', `<h1>X dry run</h1><p class="note">Pick an article to see the exact X post. Nothing is posted from this page.</p><ul>${items}</ul>`)
  }

  const { data: a } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, category, tags')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!a) return page('Not found', '<h1>No published article with that slug</h1><p><a href="?">Back</a></p>')

  const plan = await planXPost(
    { id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, imageUrl: a.image_url, category: a.category, tags: a.tags },
    `${SITE}/articles/${a.slug}`
  )

  const tweets = plan.parts
    .map(
      (p, i) => `<div class="tweet${i > 0 ? ' reply' : ''}">
        <div class="who">Culture Alberta <span>@Culturealberta</span></div>
        <div class="text">${esc(p.text)}</div>
        ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : ''}
        <div class="meta">${[...p.text].length} characters (links count as 23 on X)</div>
      </div>`
    )
    .join('')

  return page(
    `X post: ${a.title}`,
    `<p><a href="?">&larr; All articles</a></p>
     <h1>${esc(a.title)}</h1>
     <p class="note">Link placement for this article: <b>${plan.arm === 'link_post' ? 'link in the post' : 'link in a reply'}</b>.
     Bullets written by <b>${plan.bullets.source === 'claude' ? 'Claude' : 'the excerpt (fallback)'}</b>${plan.bullets.note ? ` — ${esc(plan.bullets.note)}` : ''}.
     Nothing is posted from this page.</p>
     ${tweets}`
  )
}
