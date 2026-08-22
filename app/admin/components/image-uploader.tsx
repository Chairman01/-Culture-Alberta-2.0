"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/app/components/ui/spinner"

interface ImageUploaderProps {
  onSelect: (url: string) => void
  onClose: () => void
}

// Convert all images to JPEG for maximum social media compatibility
// Reddit's crawler has issues with PNG format for Open Graph images
/**
 * How long to wait for the browser to decode an image before giving up.
 *
 * There has to be a limit. The decode is driven by `onload`/`onerror`, and for
 * a file the browser cannot read, neither always fires -- the promise then
 * never settles and the dialog sits on its spinner forever with nothing to
 * report. A visible failure beats a silent hang.
 */
const CONVERT_TIMEOUT_MS = 20000

/**
 * Cap on the longest edge before conversion.
 *
 * Canvas has a maximum area -- around 16.7 million pixels on iOS Safari, which
 * a modern phone photo exceeds on its own. Past it `toBlob` hands back null and
 * the upload fails for no reason the writer can act on. Downscaling first also
 * keeps the JPEG from coming out larger than the PNG that went in.
 */
const MAX_DIMENSION = 2400

/** Formats no browser will decode, whatever the extension claims. */
function undecodableFormat(file: File): string | null {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return 'iPhone photos (HEIC) cannot be read by browsers. On the phone, share it as JPEG, or take a screenshot of it and upload that.'
  }
  if (/tiff?$/i.test(file.type) || /\.tiff?$/i.test(file.name)) {
    return 'TIFF images cannot be read by browsers. Save it as JPEG or PNG first.'
  }
  return null
}

// Convert all images to JPEG for maximum social media compatibility.
// Reddit's crawler has issues with PNG format for Open Graph images.
async function convertToJpeg(file: File): Promise<File> {
  // Only skip if already JPEG - convert PNG and other formats to JPEG for Reddit compatibility
  if (file.type === 'image/jpeg') {
    return file
  }

  const unsupported = undecodableFormat(file)
  if (unsupported) throw new Error(unsupported)

  console.log('🔄 Converting image from', file.type, 'to JPEG for social media compatibility')

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      fn()
    }

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            'The browser could not read this image (it timed out). Try re-saving it as a JPEG or PNG and uploading again.',
          ),
        ),
      )
    }, CONVERT_TIMEOUT_MS)

    img.onload = () => {
      // Scale the longest edge down to MAX_DIMENSION, keeping the aspect ratio.
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        finish(() => reject(new Error('Failed to get canvas context')))
        return
      }

      // Fill with white background (for transparency in WebP/PNG)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            finish(() =>
              reject(
                new Error(
                  'The browser ran out of room converting this image. Try a smaller one, or save it as a JPEG first.',
                ),
              ),
            )
            return
          }

          const jpegFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          })

          console.log('✅ Image converted to JPEG:', jpegFile.name, 'Size:', jpegFile.size)
          finish(() => resolve(jpegFile))
        },
        'image/jpeg',
        0.9, // Quality: 90%
      )
    }

    img.onerror = () => {
      finish(() =>
        reject(
          new Error(
            'The browser could not read this image. Try re-saving it as a JPEG or PNG and uploading again.',
          ),
        ),
      )
    }

    img.src = url
  })
}

async function getUploadResult(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const message = (await response.text()).trim()
  return {
    error: message || `Upload failed with status ${response.status}`,
  }
}

export function ImageUploader({ onSelect, onClose }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const MAX_SIZE_MB = 5

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // Upload image to Supabase Storage via API
  const uploadImage = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setUploadProgress('Preparing image...')

    try {
      // Convert WebP and other formats to JPEG for social media compatibility
      // Reddit/Embedly don't reliably support WebP for Open Graph previews
      setUploadProgress('Converting to JPEG for social media compatibility...')
      const convertedFile = await convertToJpeg(file)

      // The size check before this ran against the file the writer picked. What
      // gets sent is the converted one, and a big PNG can come out of the
      // encoder larger than it went in -- which the server then rejects with a
      // message that makes no sense next to a file that was under the limit.
      if (convertedFile.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(
          `This image is still ${(convertedFile.size / 1024 / 1024).toFixed(1)}MB after conversion, over the ${MAX_SIZE_MB}MB limit. Try resizing it first.`,
        )
      }

      setUploadProgress('Uploading image...')
      const formData = new FormData()
      formData.append('image', convertedFile)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await getUploadResult(response)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your admin session has expired. Please log in again, then retry the upload.')
        }

        if (response.status === 403) {
          throw new Error('The upload was blocked. Please make sure you are logged in with an admin or contributor account.')
        }

        throw new Error(result.error || 'Failed to upload image')
      }

      setUploadProgress('Upload complete!')

      // Return the public URL from Supabase Storage
      onSelect(result.url)
    } catch (err) {
      console.error('Image upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsLoading(false)
      setUploadProgress(null)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image must be less than ${MAX_SIZE_MB}MB.`)
        return
      }
      await uploadImage(file)
    } else {
      setError('Please select a valid image file.')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image must be less than ${MAX_SIZE_MB}MB.`)
        return
      }
      await uploadImage(file)
    } else {
      setError('Please select a valid image file.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Upload Image</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={isLoading}
          />
          <label
            htmlFor="image-upload"
            className={`cursor-pointer block ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Images will be stored securely and work on social media
              </p>
              <Button variant="outline" disabled={isLoading}>Select Image</Button>
              {isLoading && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <Spinner />
                  {uploadProgress && <p className="text-sm text-muted-foreground">{uploadProgress}</p>}
                </div>
              )}
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

