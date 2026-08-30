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
let fontPromise: Promise<ArrayBuffer> | null = null
function loadFont(origin: string): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = fetch(`${origin}/fonts/ArchivoBlack-Regular.ttf`).then((r) => {
      if (!r.ok) throw new Error(`font fetch failed: ${r.status}`)
      return r.arrayBuffer()
    })
  }
  return fontPromise
}

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
  const font = await loadFont(origin)

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
          fontFamily: 'Archivo Black',
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
          }}
        >
          {category}
        </div>

        <div style={{ position: 'absolute', top: 36, right: 44, display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: '#000000',
              color: '#ffffff',
              fontSize: 19,
              lineHeight: 1.05,
              textAlign: 'center',
            }}
          >
            CULTURE ALBERTA
          </div>
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
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 52,
            display: 'flex',
            color: '#ffffff',
            fontSize: 34,
            letterSpacing: 2,
          }}
        >
          CULTURE
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Archivo Black', data: font, style: 'normal', weight: 400 }],
    }
  )
}
