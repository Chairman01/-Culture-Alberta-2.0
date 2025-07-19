"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "../../components/ui/spinner"

interface ImageUploaderProps {
  onSelect: (url: string) => void
  onClose: () => void
}

export function ImageUploader({ onSelect, onClose }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX_SIZE_MB = 2

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
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
      setIsLoading(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          onSelect(result)
        }
        setIsLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to read image file.')
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } else {
      setError('Please select a valid image file.')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image must be less than ${MAX_SIZE_MB}MB.`)
        return
      }
      setIsLoading(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          onSelect(result)
        }
        setIsLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to read image file.')
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
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
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
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
              <Button variant="outline" disabled={isLoading}>Select Image</Button>
              {isLoading && <div className="flex justify-center mt-2"><Spinner /></div>}
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
