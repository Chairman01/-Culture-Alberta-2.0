'use client'

import { supabaseBrowser } from './supabase-browser'

// ---------------------------------------------------------------------------
// Profile pictures for readers.
//
// Files live at avatars/{user_id}/{timestamp}.jpg. The uid prefix is what the
// storage RLS policy checks, so a reader can only ever write inside their own
// folder — see supabase/add-user-avatars.sql.
//
// Every upload gets a fresh timestamped name rather than overwriting a fixed
// one. A stable URL would keep serving the old picture from the CDN for hours
// after a change, which reads as "the upload didn't work".
// ---------------------------------------------------------------------------

const BUCKET = 'avatars'

/** The avatar renders at 64px; 512 covers retina and still lands well under 100KB. */
const MAX_EDGE = 512
const JPEG_QUALITY = 0.9

/** Rejected before decoding. Phone cameras produce 5-10MB files routinely. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

/**
 * Decoded in the browser, so the format has to be one browsers actually decode.
 * HEIC is the notable absence — iPhones hand it over from the file picker and
 * canvas cannot read it, so it's rejected by name rather than failing opaquely.
 */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const AVATAR_ACCEPT = ACCEPTED.join(',')

export interface AvatarUpload {
  /** Public URL to store on the user as avatar_url. */
  url: string
  /** Storage path, kept so the next upload can clean this one up. */
  path: string
}

export class AvatarError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> path — older Safari rejects some WebP here.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new AvatarError('That image could not be read. Try a JPG or PNG.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Centre-crop to a square and shrink to MAX_EDGE.
 *
 * Cropping here rather than with CSS means the stored file is already the
 * shape every surface wants, so the nav and the account page cannot disagree
 * about which part of a tall photo is the face.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const source = await decode(file)
  const width = 'width' in source ? source.width : 0
  const height = 'height' in source ? source.height : 0
  if (!width || !height) throw new AvatarError('That image could not be read. Try a JPG or PNG.')

  const edge = Math.min(width, height)
  const size = Math.min(edge, MAX_EDGE)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AvatarError('Could not process that image in this browser.')

  ctx.drawImage(
    source as CanvasImageSource,
    (width - edge) / 2, (height - edge) / 2, edge, edge,
    0, 0, size, size
  )

  if ('close' in source && typeof source.close === 'function') source.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  )
  if (!blob) throw new AvatarError('Could not process that image. Try a different one.')
  return blob
}

/**
 * Resize, upload, and return the public URL.
 *
 * `previousPath` is deleted afterwards so a reader who changes their picture a
 * dozen times leaves one file behind rather than a dozen. A failed delete is
 * swallowed: an orphaned file is untidy, not broken, and the new avatar is
 * already live by then.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  previousPath?: string | null
): Promise<AvatarUpload> {
  if (!ACCEPTED.includes(file.type)) {
    throw new AvatarError('Please choose a JPG, PNG, WebP or GIF image.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AvatarError('That image is too large. Please choose one under 12MB.')
  }

  const blob = await toSquareJpeg(file)
  const path = `${userId}/${Date.now()}.jpg`

  const { error } = await supabaseBrowser.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new AvatarError(error.message || 'Upload failed. Please try again.')

  const { data } = supabaseBrowser.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new AvatarError('Upload succeeded but no URL came back.')

  if (previousPath && previousPath !== path) {
    await supabaseBrowser.storage.from(BUCKET).remove([previousPath]).catch(() => {})
  }

  return { url: data.publicUrl, path }
}

/** Drop the stored file for a reader clearing their picture. */
export async function removeAvatarFile(path?: string | null): Promise<void> {
  if (!path) return
  await supabaseBrowser.storage.from(BUCKET).remove([path]).catch(() => {})
}
