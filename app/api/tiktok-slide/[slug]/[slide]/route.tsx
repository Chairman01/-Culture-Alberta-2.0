/**
 * TikTok carousel slides, 1080x1920 JPEG — full-bleed, like the Instagram posts.
 *
 *   /api/tiktok-slide/<slug>/cover.jpg              hero photo + headline (the hook)
 *   /api/tiktok-slide/<slug>/point.jpg?n=1&of=3&t=…&s=…
 *                                                    the article's next photo + one fact
 *   /api/tiktok-slide/<slug>/end.jpg                "Full story: link in bio"
 *
 * Every slide is a photo filling the whole frame — no dark bars, no backdrop.
 * The cover uses the article's main image; each later slide takes the next
 * image found in the article body, cycling if there are fewer images than
 * slides. Article photos are mostly landscape and a TikTok slide is tall, so
 * filling the frame means trimming the sides: sharp's attention-based crop
 * picks the part of the photo with the subject in it rather than the centre.
 *
 * Point text comes from the URL and must carry a valid signature (see
 * lib/social/slide-signing), so nobody can make a branded slide say anything.
 *
 * Everything readable stays inside TikTok's safe zone: the app covers roughly
 * the top 150px, the bottom 450px (caption, sound) and the right 150px (like,
 * comment, share buttons).
 *
 * TikTok photo posts take JPEG or WEBP, not PNG, so output is JPEG via sharp
 * (bundled with Next.js). If sharp is missing, PNG is served instead.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSocialImageUrl } from '@/lib/social-image-url'
import { decodeSlideText, verifySlide } from '@/lib/social/slide-signing'

export const runtime = 'nodejs'
export const revalidate = 86400

const W = 1080
const H = 1920
const SAFE_LEFT = 72
const SAFE_RIGHT = 170
const SAFE_TOP = 170
const SAFE_BOTTOM = 470
const TEXT_W = W - SAFE_LEFT - SAFE_RIGHT

type Sharp = typeof import('sharp')
let sharpPromise: Promise<Sharp | null> | null = null
function loadSharp() {
  if (!sharpPromise) {
    sharpPromise = import('sharp').then((m) => m.default as unknown as Sharp).catch((err) => {
      console.warn('[tiktok slide] sharp unavailable:', err)
      return null
    })
  }
  return sharpPromise
}

let fontsPromise: Promise<Array<{ name: string; data: ArrayBuffer | Buffer; weight: 400 | 500 | 900 }>> | null = null
function loadFonts(origin: string) {
  if (!fontsPromise) {
    const optional = (file: string) => readFile(join(process.cwd(), 'assets/fonts', file)).catch(() => null)
    fontsPromise = Promise.all([
      fetch(`${origin}/fonts/LibreFranklin-Black.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/LibreFranklin-Medium.ttf`).then((r) => r.arrayBuffer()),
      optional('Kollektif-Regular.ttf'),
      optional('Anton-Regular.ttf'),
    ]).then(([black, medium, kollektif, anton]) => [
      { name: 'Libre Franklin', data: black, weight: 900 as const },
      { name: 'Libre Franklin', data: medium, weight: 500 as const },
      ...(kollektif ? [{ name: 'Kollektif', data: kollektif, weight: 400 as const }] : []),
      ...(anton ? [{ name: 'Anton', data: anton, weight: 400 as const }] : []),
    ])
  }
  return fontsPromise
}

/** The main image, then every distinct image in the article body. */
function articleImages(mainImage: string | null, html: string | null): string[] {
  const found: string[] = []
  const add = (src?: string | null) => {
    if (!src || src.startsWith('data:')) return
    const url = getSocialImageUrl(src)
    if (!found.includes(url)) found.push(url)
  }
  add(mainImage)
  for (const m of (html ?? '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(m[1])
  return found
}

/**
 * Fill the 1080x1920 frame from a photo, cropping to the part with the most
 * visual interest. Returned as a data URL so the renderer doesn't fetch again.
 * Falls back to the plain URL (the renderer then centre-crops) if anything
 * goes wrong.
 */
async function fillFrame(url: string): Promise<string> {
  const sharp = await loadSharp()
  if (!sharp) return url
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const input = Buffer.from(await res.arrayBuffer())
    const out = await sharp(input)
      .resize(W, H, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 86 })
      .toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch (err) {
    console.warn('[tiktok slide] smart crop failed, using centre crop:', err)
    return url
  }
}

async function toJpeg(png: ArrayBuffer): Promise<{ body: ArrayBuffer | Uint8Array; type: string }> {
  const sharp = await loadSharp()
  if (!sharp) return { body: png, type: 'image/png' }
  const jpg = await sharp(Buffer.from(png)).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  return { body: new Uint8Array(jpg), type: 'image/jpeg' }
}

function headlineSize(title: string): number {
  const n = title.length
  if (n <= 50) return 96
  if (n <= 75) return 84
  if (n <= 100) return 74
  return 64
}

function pointSize(text: string): number {
  const n = text.length
  if (n <= 40) return 88
  if (n <= 60) return 76
  return 66
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; slide: string }> }
) {
  const { slug, slide: rawSlide } = await params
  const slide = rawSlide.replace(/\.(jpe?g|png)$/i, '')
  const origin = request.nextUrl.origin
  const q = request.nextUrl.searchParams

  const { data: article } = await supabase
    .from('articles')
    .select('title, category, image_url, content, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!article) return new Response('Not found', { status: 404 })

  let pointText = ''
  if (slide === 'point') {
    const decoded = decodeSlideText(q.get('t') ?? '')
    if (!decoded || !verifySlide(slug, decoded, q.get('s') ?? '')) {
      return new Response('Invalid slide signature', { status: 403 })
    }
    pointText = decoded
  } else if (slide !== 'cover' && slide !== 'end') {
    return new Response('Unknown slide', { status: 404 })
  }

  const n = Math.max(1, Number(q.get('n')) || 1)
  const of = Math.max(n, Number(q.get('of')) || 1)
  const images = articleImages(article.image_url, article.content)
  // cover → image 0; point n → image n; end → the image after the last point.
  const index = slide === 'cover' ? 0 : slide === 'point' ? n : of + 1
  const photo = await fillFrame(images.length > 0 ? images[index % images.length] : getSocialImageUrl(null))

  const title = (article.title ?? '').trim()
  const city = (article.category ?? 'Alberta').toUpperCase()
  const fonts = await loadFonts(origin)
  const hasKollektif = fonts.some((f) => f.name === 'Kollektif')
  const hasAnton = fonts.some((f) => f.name === 'Anton')

  // Shade only where text sits: a light wash at the top for the label and
  // badges, and a deep fade at the bottom for the headline or fact.
  const shade =
    slide === 'cover'
      ? 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.9) 100%)'
      : 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 16%, rgba(0,0,0,0.35) 34%, rgba(0,0,0,0.78) 52%, rgba(0,0,0,0.88) 100%)'

  const topBar = (
    <>
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP,
          left: SAFE_LEFT,
          display: 'flex',
          color: '#fff',
          fontSize: 38,
          letterSpacing: 4,
          ...(hasKollektif ? { fontFamily: 'Kollektif', fontWeight: 400 } : { fontWeight: 500 }),
        }}
      >
        {city}
      </div>
      <div style={{ position: 'absolute', top: SAFE_TOP - 26, left: W - SAFE_RIGHT - 206, width: 206, display: 'flex', justifyContent: 'space-between' }}>
        {['/images/pin/culture-alberta-badge.png', '/images/pin/culture-yyc-badge.png'].map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p} src={`${origin}${p}`} alt="" width={96} height={96} style={{ width: 96, height: 96 }} />
        ))}
      </div>
    </>
  )

  // Text is anchored to the bottom of the safe zone so it sits on the deep
  // part of the fade, clear of TikTok's caption and buttons.
  const textBottom = H - SAFE_BOTTOM

  let body: React.ReactNode
  if (slide === 'cover') {
    body = (
      <div style={{ position: 'absolute', left: SAFE_LEFT, width: TEXT_W + 40, bottom: H - textBottom, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', color: '#fff', fontSize: headlineSize(title), lineHeight: 1.06, fontWeight: 900 }}>{title}</div>
        <div style={{ display: 'flex', marginTop: 28, color: '#ffffffd0', fontSize: 34, fontWeight: 500 }}>Swipe for the key facts →</div>
      </div>
    )
  } else if (slide === 'point') {
    body = (
      <div style={{ position: 'absolute', left: SAFE_LEFT, width: TEXT_W, bottom: H - textBottom, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', color: '#e60023', fontSize: 120, fontWeight: 900, lineHeight: 1 }}>{String(n)}</div>
        <div style={{ display: 'flex', marginTop: 24, color: '#fff', fontSize: pointSize(pointText), lineHeight: 1.12, fontWeight: 900 }}>{pointText}</div>
        <div style={{ display: 'flex', marginTop: 28, color: '#ffffffa0', fontSize: 30, fontWeight: 500 }}>{`${n} of ${of}`}</div>
      </div>
    )
  } else {
    body = (
      <div style={{ position: 'absolute', left: SAFE_LEFT, width: TEXT_W, bottom: H - textBottom, display: 'flex', flexDirection: 'column', color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 108, fontWeight: 900, lineHeight: 1.02 }}>Full story</div>
        <div style={{ display: 'flex', fontSize: 108, fontWeight: 900, lineHeight: 1.02, color: '#e60023' }}>link in bio</div>
        <div style={{ display: 'flex', marginTop: 36, fontSize: 40, fontWeight: 500, color: '#ffffffd0' }}>culturealberta.com</div>
        <div style={{ display: 'flex', marginTop: 56, fontSize: 64, letterSpacing: 2, ...(hasAnton ? { fontFamily: 'Anton', fontWeight: 400 } : { fontWeight: 900 }) }}>
          CULTURE
        </div>
        <div style={{ display: 'flex', marginTop: 6, fontSize: 34, fontWeight: 500, color: '#ffffffd0' }}>Follow for Alberta news & things to do</div>
      </div>
    )
  }

  const png = await new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#111', fontFamily: 'Libre Franklin' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, background: shade }} />
        {topBar}
        {body}
      </div>
    ),
    { width: W, height: H, fonts: fonts.map((f) => ({ ...f, style: 'normal' as const })) }
  ).arrayBuffer()

  const { body: out, type } = await toJpeg(png)
  return new Response(out as BodyInit, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
  })
}
