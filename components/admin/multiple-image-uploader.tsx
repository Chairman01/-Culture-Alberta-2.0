"use client"

import { useState, useCallback } from 'react'
import { X, Upload, Image as ImageIcon, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArticleImage } from '@/lib/types/article'

interface MultipleImageUploaderProps {
  images: ArticleImage[]
  onChange: (images: ArticleImage[]) => void
  maxImages?: number
}

export function MultipleImageUploader({ 
  images = [], 
  onChange, 
  maxImages = 10 
}: MultipleImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const addImage = useCallback(() => {
    if (images.length >= maxImages) return
    
    const newImage: ArticleImage = {
      url: '',
      alt: '',
      caption: '',
      order: images.length + 1
    }
    onChange([...images, newImage])
  }, [images, onChange, maxImages])

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    // Reorder remaining images
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i + 1
    }))
    onChange(reorderedImages)
  }, [images, onChange])

  const updateImage = useCallback((index: number, field: keyof ArticleImage, value: string) => {
    const newImages = [...images]
    newImages[index] = {
      ...newImages[index],
      [field]: value
    }
    onChange(newImages)
  }, [images, onChange])

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return
    
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    
    // Reorder all images
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i + 1
    }))
    onChange(reorderedImages)
  }, [images, onChange])

  const handleFileUpload = useCallback(async (file: File, index: number) => {
    setIsUploading(true)
    try {
      // For now, we'll use a placeholder URL
      // In a real implementation, you'd upload to your storage service
      const fakeUrl = URL.createObjectURL(file)
      
      updateImage(index, 'url', fakeUrl)
      updateImage(index, 'alt', file.name.replace(/\.[^/.]+$/, ''))
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsUploading(false)
    }
  }, [updateImage])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Images ({images.length}/{maxImages})</h3>
        <Button
          type="button"
          onClick={addImage}
          disabled={images.length >= maxImages || isUploading}
          variant="outline"
          size="sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Add Image
        </Button>
      </div>

      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No images added yet</p>
          <p className="text-sm text-gray-500">Click "Add Image" to get started</p>
        </div>
      )}

      <div className="space-y-4">
        {images.map((image, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start gap-4">
              {/* Drag handle */}
              <button
                type="button"
                className="mt-2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  if (index > 0) moveImage(index, index - 1)
                }}
              >
                <GripVertical className="w-4 h-4" />
              </button>

              {/* Image preview */}
              <div className="flex-shrink-0">
                {image.url ? (
                  <div className="w-24 h-24 bg-white border rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.alt || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-white border rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Image details */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <Input
                      value={image.url}
                      onChange={(e) => updateImage(index, 'url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alt Text
                    </label>
                    <Input
                      value={image.alt || ''}
                      onChange={(e) => updateImage(index, 'alt', e.target.value)}
                      placeholder="Descriptive alt text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caption
                  </label>
                  <Textarea
                    value={image.caption || ''}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                    placeholder="Optional caption for the image"
                    rows={2}
                  />
                </div>

                {/* File upload alternative */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or upload file
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file, index)
                      }
                    }}
                    disabled={isUploading}
                  />
                </div>
              </div>

              {/* Remove button */}
              <Button
                type="button"
                onClick={() => removeImage(index)}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Order indicator */}
            <div className="mt-2 text-xs text-gray-500">
              Order: {image.order || index + 1}
            </div>
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div className="text-sm text-gray-600">
          <p>• Drag images to reorder them</p>
          <p>• First image will be used as the main featured image</p>
          <p>• All images will be displayed in the article</p>
        </div>
      )}
    </div>
  )
}
