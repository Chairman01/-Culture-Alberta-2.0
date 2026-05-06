'use client'

import Image from 'next/image'
import { useState } from 'react'

interface EventImageProps {
  imageUrl?: string
  image_url?: string
  title: string
}

export function EventImage({ imageUrl, image_url, title }: EventImageProps) {
  // Get the first valid image URL
  const getValidImageUrl = () => {
    const url = imageUrl || image_url
    // Return null if URL is empty, undefined, or not a string
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null
    }
    return url
  }

  const [imgSrc, setImgSrc] = useState<string | null>(getValidImageUrl())

  // Render a placeholder container if no image, to avoid layout shift
  if (!imgSrc) {
    return null
  }

  return (
    <div className="aspect-[16/9] w-full relative rounded-lg overflow-hidden mb-6 bg-gray-100">
      <Image
        src={imgSrc}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
        onError={() => {
          setImgSrc(null)
        }}
      />
    </div>
  )
}

