'use client'

import Image from 'next/image'
import { useState } from 'react'

interface EventImageProps {
  imageUrl?: string
  image_url?: string
  title: string
}

export function EventImage({ imageUrl, image_url, title }: EventImageProps) {
  const [imgSrc, setImgSrc] = useState(
    imageUrl || 
    image_url || 
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop"
  )

  return (
    <div className="aspect-[16/9] w-full relative rounded-lg overflow-hidden mb-6">
      <Image
        src={imgSrc}
        alt={title}
        fill
        className="object-cover"
        onError={() => {
          setImgSrc("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop")
        }}
      />
    </div>
  )
}

