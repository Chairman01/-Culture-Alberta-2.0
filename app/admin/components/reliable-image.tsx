"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createFallbackImageUrl } from "../utils/image-utils"

interface ReliableImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  onLoad?: () => void
  onError?: () => void
}

/**
 * A component that reliably displays images, falling back to a placeholder if the image fails to load
 */
export function ReliableImage({
  src,
  alt,
  className = "",
  width,
  height,
  onLoad,
  onError,
  ...rest
}: ReliableImageProps & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [imgSrc, setImgSrc] = useState<string>(src)
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    // Reset error state when src changes
    setHasError(false)
    setImgSrc(src)
  }, [src])

  const handleError = () => {
    if (!hasError) {
      console.error(`Image failed to load: ${src}`)
      setHasError(true)
      setImgSrc(createFallbackImageUrl(alt))
      onError?.()
    }
  }

  const handleLoad = () => {
    onLoad?.()
  }

  return (
    <img
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  )
}
