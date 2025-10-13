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

  // Don't render anything if there's no valid image URL
  if (!imgSrc) {
    return null
  }

  return (
    <div className="aspect-[16/9] w-full relative rounded-lg overflow-hidden mb-6">
      <Image
        src={imgSrc}
        alt={title}
        fill
        className="object-cover"
        onError={() => {
          setImgSrc(null)
        }}
      />
    </div>
  )
}

