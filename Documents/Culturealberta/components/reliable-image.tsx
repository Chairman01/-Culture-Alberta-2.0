"use client"

import { useState } from "react"
import Image from "next/image"

interface ReliableImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function ReliableImage({
  src,
  alt,
  width = 800,
  height = 450,
  className = "",
  priority = false,
}: ReliableImageProps) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div
        className={`relative overflow-hidden bg-muted ${className}`}
        style={{ width, height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-sm text-center px-4">
            {alt || "Image not available"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setError(true)}
    />
  )
}
