"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/app/components/ui/spinner"

interface ImageUploaderProps {
  onSelect: (url: string) => void
  onClose: () => void
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
    setUploadProgress('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('image', file)

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

