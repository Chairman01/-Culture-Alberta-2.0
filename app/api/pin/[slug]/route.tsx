/**
 * Pin image generator.
 *
 * Renders the Culture Alberta card at exactly 1000x1500 — the 2:3 shape
 * Pinterest ranks best — from the article's own photo and headline. Nothing is
 * placed by hand, so the size is right by construction and a long headline
 * shrinks to fit instead of overflowing.
 *
 * Pinterest fetches this URL directly when creating the Pin, so the image never
 * has to be uploaded anywhere.
 *
 * GET /api/pin/<slug>
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSocialImageUrl } from '@/lib/social-image-url'

export const runtime = 'nodejs'
// The card only changes when the article does; let the CDN carry the load.
export const revalidate = 86400

const WIDTH = 1000
const HEIGHT = 1500

// The band the untouched photo is fitted into. Sized so a 16:9 landscape shot —
// 563px tall at this width — sits clear of both the badges and the headline.
const PHOTO_TOP = 150
const PHOTO_BAND = 780

// Fetched once per lambda rather than per request. The renderer needs real font
// data — it cannot use a CSS font the way the site does.
//
// The brand faces live in assets/fonts rather than public/, so the files are
// read from disk and never served to anyone (licences are alongside them):
//   Kollektif       the city label, as in the Canva templates
//   Anton           the CULTURE wordmark — a free stand-in for the template's
//                   OPTIMorgan One, which cannot be licensed (see
//                   assets/fonts/README.md)
// Any that cannot be read fall back to Libre Franklin rather than failing the
// whole card.
type BrandFont = 'Kollektif-Regular' | 'Anton-Regular'

interface PinFonts {
  black: ArrayBuffer
  medium: ArrayBuffer
  brand: Partial<Record<BrandFont, Buffer>>
}

async function loadBrandFont(name: BrandFont): Promise<[BrandFont, Buffer] | null> {
  try {
    return [name, await readFile(join(process.cwd(), 'assets/fonts', `${name}.ttf`))]
  } catch (err) {
    console.warn(`[pin card] ${name} unavailable, using Libre Franklin:`, err)
    return null
  }
}

let fontsPromise: Promise<PinFonts> | null = null
function loadFonts(origin: string) {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(`${origin}/fonts/LibreFranklin-Black.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/LibreFranklin-Medium.ttf`).then((r) => r.arrayBuffer()),
      Promise.all(
        (['Kollektif-Regular', 'Anton-Regular'] as const).map(loadBrandFont)
      ),
    ]).then(([black, medium, loaded]) => ({
      black,
      medium,
      brand: Object.fromEntries(loaded.filter((f) => f !== null)),
    }))
  }
  return fontsPromise
}


// The two brand badges, side by side, as on the Instagram posts.
const BADGE_SIZE = 104
const BADGES = ['/images/pin/culture-alberta-badge.png', '/images/pin/culture-yyc-badge.png']

/**
 * Long headlines get smaller type rather than a clipped card. The thresholds
 * are tuned to the width above, not guessed.
 */
function headlineSize(title: string): number {
  const n = title.length
  if (n <= 45) return 82
  if (n <= 70) return 70
  if (n <= 95) return 60
  if (n <= 125) return 52
  return 46
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const origin = request.nextUrl.origin

  const { data: article } = await supabase
    .from('articles')
    .select('title, category, image_url, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!article) return new Response('Not found', { status: 404 })

  const title = (article.title ?? '').trim()
  const category = (article.category ?? 'Alberta').toUpperCase()
  const background = getSocialImageUrl(article.image_url)
  const fonts = await loadFonts(origin)

  const kollektif = fonts.brand['Kollektif-Regular']
  const anton = fonts.brand['Anton-Regular']

  const brandFonts = [
    ...(kollektif ? [{ name: 'Kollektif', data: kollektif }] : []),
    ...(anton ? [{ name: 'Anton', data: anton }] : []),
  ].map((f) => ({ ...f, style: 'normal' as const, weight: 400 as const }))

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#111111',
          fontFamily: 'Libre Franklin',
        }}
      >
        {/*
          Two layers, because article photos are landscape and this frame is
          portrait. A single cover image would fill the frame by cropping the
          sides — which is how a face or a sign gets cut off.

          So: a cropped, heavily darkened copy fills the background, and the
          WHOLE photo sits on top, contained. Nothing is ever cut off, and there
          are no empty bars — the backdrop is the photo's own colours.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={background}
          alt=""
          width={WIDTH}
          height={HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            backgroundColor: 'rgba(10,10,12,0.82)',
          }}
        />

        {/* The photo in full, whatever its shape. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={background}
          alt=""
          width={WIDTH}
          height={PHOTO_BAND}
          style={{
            position: 'absolute',
            top: PHOTO_TOP,
            left: 0,
            width: WIDTH,
            height: PHOTO_BAND,
            objectFit: 'contain',
          }}
        />

        {/* Keeps the corners readable regardless of what the photo does there. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 72%, rgba(0,0,0,0.92) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 44,
            left: 48,
            display: 'flex',
            color: '#ffffff',
            fontSize: 30,
            letterSpacing: 3,
            fontWeight: kollektif ? 400 : 500,
            ...(kollektif ? { fontFamily: 'Kollektif' } : {}),
          }}
        >
          {category}
        </div>

        <div style={{ position: 'absolute', top: 36, right: 44, display: 'flex', gap: 14 }}>
          {BADGES.map((path) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={path}
              src={`${origin}${path}`}
              alt=""
              width={BADGE_SIZE}
              height={BADGE_SIZE}
              style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 48,
            right: 48,
            bottom: 150,
            display: 'flex',
            color: '#ffffff',
            fontSize: headlineSize(title),
            lineHeight: 1.08,
            fontWeight: 900,
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 48,
            display: 'flex',
            color: '#ffffff',
            ...(anton
              ? { fontFamily: 'Anton', fontSize: 44, fontWeight: 400, letterSpacing: 1 }
              : { fontSize: 34, letterSpacing: 2, fontWeight: 900 }),
          }}
        >
          CULTURE
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Libre Franklin', data: fonts.black, style: 'normal', weight: 900 },
        { name: 'Libre Franklin', data: fonts.medium, style: 'normal', weight: 500 },
        ...brandFonts,
      ],
    }
  )
}
