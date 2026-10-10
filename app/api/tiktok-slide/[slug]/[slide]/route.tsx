/**
 * TikTok carousel slides, 1080x1920 JPEG.
 *
 *   /api/tiktok-slide/<slug>/cover.jpg              photo + headline (the hook)
 *   /api/tiktok-slide/<slug>/point.jpg?n=1&of=3&t=…&s=…
 *                                                    one bullet, big type
 *   /api/tiktok-slide/<slug>/end.jpg                "Full story: link in bio"
 *
 * Point text comes from the URL and must carry a valid signature (see
 * lib/social/slide-signing), so nobody can make a branded slide say anything.
 *
 * Layout keeps everything inside TikTok's safe zone: the app covers roughly
 * the top 150px, the bottom 450px (caption, sound) and the right 150px (like,
 * comment, share buttons), so nothing important sits there.
 *
 * TikTok photo posts take JPEG or WEBP, not PNG, so the PNG from ImageResponse
 * is converted with sharp (bundled with Next.js). If sharp is missing the PNG
 * is served instead rather than failing.
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

let fontsPromise: Promise<Array<{ name: string; data: ArrayBuffer | Buffer; weight: 400 | 500 | 900 }>> | null = null
function loadFonts(origin: string) {
  if (!fontsPromise) {
    const optional = (file: string) =>
      readFile(join(process.cwd(), 'assets/fonts', file)).catch(() => null)
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

async function toJpeg(png: ArrayBuffer): Promise<{ body: ArrayBuffer | Uint8Array; type: string }> {
  try {
    const sharp = (await import('sharp')).default
    const jpg = await sharp(Buffer.from(png)).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
    return { body: new Uint8Array(jpg), type: 'image/jpeg' }
  } catch (err) {
    console.warn('[tiktok slide] sharp unavailable, serving PNG:', err)
    return { body: png, type: 'image/png' }
  }
}

function headlineSize(title: string): number {
  const n = title.length
  if (n <= 50) return 92
  if (n <= 75) return 80
  if (n <= 100) return 70
  return 62
}

function pointSize(text: string): number {
  const n = text.length
  if (n <= 40) return 84
  if (n <= 60) return 74
  return 64
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
    .select('title, category, image_url, status')
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

  const title = (article.title ?? '').trim()
  const city = (article.category ?? 'Alberta').toUpperCase()
  const photo = getSocialImageUrl(article.image_url)
  const fonts = await loadFonts(origin)
  const hasKollektif = fonts.some((f) => f.name === 'Kollektif')
  const hasAnton = fonts.some((f) => f.name === 'Anton')
  const n = Number(q.get('n')) || 1
  const of = Number(q.get('of')) || 1

  const backdrop = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundColor: slide === 'cover' ? 'rgba(10,10,12,0.78)' : 'rgba(10,10,12,0.9)' }} />
    </>
  )

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

  let body: React.ReactNode
  if (slide === 'cover') {
    body = (
      <>
        {/* The whole photo, uncropped, in a band below the top bar. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" width={W} height={640} style={{ position: 'absolute', top: SAFE_TOP + 120, left: 0, width: W, height: 640, objectFit: 'contain' }} />
        <div
          style={{
            position: 'absolute',
            left: SAFE_LEFT,
            width: TEXT_W + 40,
            top: SAFE_TOP + 800,
            display: 'flex',
            color: '#fff',
            fontSize: headlineSize(title),
            lineHeight: 1.08,
            fontWeight: 900,
          }}
        >
          {title}
        </div>
        <div style={{ position: 'absolute', left: SAFE_LEFT, bottom: SAFE_BOTTOM - 10, display: 'flex', color: '#ffffffcc', fontSize: 34, fontWeight: 500 }}>
          Swipe for the key facts →
        </div>
      </>
    )
  } else if (slide === 'point') {
    body = (
      <>
        <div style={{ position: 'absolute', left: SAFE_LEFT, top: SAFE_TOP + 260, display: 'flex', color: '#e60023', fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
          {String(n)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: SAFE_LEFT,
            width: TEXT_W,
            top: SAFE_TOP + 430,
            display: 'flex',
            color: '#fff',
            fontSize: pointSize(pointText),
            lineHeight: 1.15,
            fontWeight: 900,
          }}
        >
          {pointText}
        </div>
        <div style={{ position: 'absolute', left: SAFE_LEFT, bottom: SAFE_BOTTOM - 10, display: 'flex', color: '#ffffff99', fontSize: 30, fontWeight: 500 }}>
          {`${n} of ${of}`}
        </div>
      </>
    )
  } else {
    body = (
      <div
        style={{
          position: 'absolute',
          left: SAFE_LEFT,
          width: TEXT_W,
          top: SAFE_TOP + 360,
          display: 'flex',
          flexDirection: 'column',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 900, lineHeight: 1.02 }}>Full story</div>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 900, lineHeight: 1.02, color: '#e60023' }}>link in bio</div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 40, fontWeight: 500, color: '#ffffffcc' }}>culturealberta.com</div>
        <div style={{ display: 'flex', marginTop: 120, fontSize: 64, letterSpacing: 2, ...(hasAnton ? { fontFamily: 'Anton', fontWeight: 400 } : { fontWeight: 900 }) }}>
          CULTURE
        </div>
        <div style={{ display: 'flex', marginTop: 8, fontSize: 34, fontWeight: 500, color: '#ffffffcc' }}>
          Follow for Alberta news & things to do
        </div>
      </div>
    )
  }

  const png = await new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#111', fontFamily: 'Libre Franklin' }}>
        {backdrop}
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
