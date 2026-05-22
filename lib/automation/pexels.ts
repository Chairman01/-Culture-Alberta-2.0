/**
 * Pexels API client — fetches a relevant photo and uploads it to Supabase Storage.
 * Free tier: 200 req/hour, 20,000/month. No attribution required for editorial use.
 *
 * Requires env var: PEXELS_API_KEY
 * Get yours at: pexels.com/api (free, instant signup)
 */

import { createClient } from '@supabase/supabase-js'

const PEXELS_BASE = 'https://api.pexels.com/v1'
const BUCKET_NAME = 'Article-image'

// City-specific search terms to get relevant photos
const CITY_PHOTO_QUERIES: Record<string, string[]> = {
  calgary:        ['Calgary Alberta festival', 'Calgary outdoor event summer', 'Calgary downtown crowd'],
  edmonton:       ['Edmonton Alberta festival', 'Edmonton outdoor summer event', 'Edmonton downtown'],
  lethbridge:     ['Lethbridge Alberta outdoor', 'Alberta small city festival', 'Alberta community event'],
  'medicine-hat': ['Medicine Hat Alberta', 'Alberta outdoor festival crowd', 'Alberta summer community'],
  'grande-prairie':['Grande Prairie Alberta', 'Alberta northern community event', 'Alberta summer festival'],
  'fort-mcmurray':['Fort McMurray Alberta', 'Northern Alberta community', 'Alberta outdoor summer'],
}

// Fallback queries if city-specific ones fail
const FALLBACK_QUERIES = [
  'Alberta Canada festival',
  'Canada outdoor summer event',
  'Canada community festival crowd',
]

interface PexelsPhoto {
  id: number
  url: string
  photographer: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
  }
  alt: string
}

/** Strip non-ASCII characters so the value is safe to use in HTTP headers. */
function sanitizeHeader(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, '').trim()
}

async function searchPexels(query: string, perPage = 10): Promise<PexelsPhoto[]> {
  const rawKey = process.env.PEXELS_API_KEY
  if (!rawKey) throw new Error('PEXELS_API_KEY env var is not set')
  const apiKey = sanitizeHeader(rawKey)

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'landscape',
    size: 'large',
  })

  const response = await fetch(`${PEXELS_BASE}/search?${params}`, {
    headers: { 'Authorization': apiKey },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Pexels API error ${response.status}`)
  }

  const data = await response.json()
  return (data.photos || []) as PexelsPhoto[]
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

/**
 * Downloads a photo from Pexels and uploads it to Supabase Storage.
 * Returns the public Supabase CDN URL.
 */
async function uploadPhotoToStorage(photo: PexelsPhoto, city: string): Promise<string> {
  const supabase = getSupabase()

  // Download the image from Pexels
  const imageResponse = await fetch(photo.src.large2x)
  if (!imageResponse.ok) throw new Error(`Failed to download Pexels image: ${imageResponse.status}`)

  const arrayBuffer = await imageResponse.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Generate a unique filename
  const timestamp = Date.now()
  const fileName = `auto-${city}-${timestamp}.jpg`

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

/**
 * Main function: finds a relevant photo for the city + weekend,
 * uploads it to your Supabase Storage, and returns the CDN URL.
 *
 * Returns { url, credit } where credit is the photographer name for attribution.
 */
export async function getCityWeekendPhoto(city: string): Promise<{
  url: string
  credit: string
}> {
  const queries = [...(CITY_PHOTO_QUERIES[city] || []), ...FALLBACK_QUERIES]

  for (const query of queries) {
    try {
      console.log(`[pexels] Searching for: "${query}"`)
      const photos = await searchPexels(query, 15)

      if (photos.length === 0) continue

      // Pick a random photo from the top results to add variety week-to-week
      const randomIndex = Math.floor(Math.random() * Math.min(photos.length, 8))
      const photo = photos[randomIndex]

      console.log(`[pexels] Found photo by ${photo.photographer}, uploading to Supabase...`)
      const url = await uploadPhotoToStorage(photo, city)

      console.log(`[pexels] Image uploaded: ${url}`)
      return {
        url,
        credit: `Photo by ${photo.photographer} via Pexels`,
      }
    } catch (err) {
      console.warn(`[pexels] Query "${query}" failed:`, err)
      // Try next query
    }
  }

  throw new Error(`[pexels] Could not find or upload a photo for city: ${city}`)
}
