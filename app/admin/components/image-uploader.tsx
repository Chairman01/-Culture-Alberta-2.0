"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/app/components/ui/spinner"

interface ImageUploaderProps {
  onSelect: (url: string) => void
  onClose: () => void
}

// Convert WebP or other formats to JPEG for social media compatibility
// Reddit and some other platforms don't reliably support WebP for Open Graph images
async function convertToJpeg(file: File): Promise<File> {
  // If already JPEG or PNG, return as-is (PNG is also widely supported)
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    return file
  }

  console.log('🔄 Converting image from', file.type, 'to JPEG for social media compatibility')

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      // Create canvas with image dimensions
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Fill with white background (for transparency in WebP/PNG)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw image
      ctx.drawImage(img, 0, 0)

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error('Failed to convert image'))
            return
          }

          // Create new file with .jpg extension
          const jpegFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: 'image/jpeg' }
          )

          console.log('✅ Image converted to JPEG:', jpegFile.name, 'Size:', jpegFile.size)
          resolve(jpegFile)
        },
        'image/jpeg',
        0.9 // Quality: 90%
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for conversion'))
    }

    img.src = url
  })
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

      setUploadProgress('Uploading image...')
      const formData = new FormData()
      formData.append('image', convertedFile)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
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

