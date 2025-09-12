"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { optimizeImageLoading } from "@/lib/vercel-optimizations"

interface ImageDisplayProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function ImageDisplay({
  src,
  alt,
  width = 800,
  height = 450,
  className = "",
  priority = false,
  ...rest
}: ImageDisplayProps) {
  // Get optimized image settings for Vercel
  const imageSettings = optimizeImageLoading()
  
  // Use optimized dimensions in production
  const optimizedWidth = imageSettings.maxWidth < width ? imageSettings.maxWidth : width
  const optimizedHeight = imageSettings.maxHeight < height ? imageSettings.maxHeight : height
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Special case for the theater article image
  const isTheaterImage =
    src === "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-nK5LnLwytCAboZHLlgB0zpkpDBF4p2.png" ||
    src.includes("hebbkx1anhila5yf.public.blob.vercel-storage.com")

  useEffect(() => {
    // Reset states when src changes
    setLoading(true)
    setError(false)

    // Set the image source
    if (isTheaterImage) {
      setImgSrc("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-nK5LnLwytCAboZHLlgB0zpkpDBF4p2.png")
      setLoading(false)
    } else {
      setImgSrc(src)
      
      // Preload image for better performance
      if (src && !src.startsWith('data:')) {
        const img = new window.Image()
        img.onload = () => setLoading(false)
        img.onerror = () => {
          setError(true)
          setLoading(false)
        }
        img.src = src
      } else {
        setLoading(false)
      }
    }
  }, [src, isTheaterImage])

  const handleError = () => {
    console.error(`Failed to load image: ${src}`)
    setError(true)
    setLoading(false)
    // Use a more informative placeholder with optimized dimensions
    setImgSrc(`data:image/svg+xml;base64,${btoa(`
      <svg width="${optimizedWidth}" height="${optimizedHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
          Image Placeholder
        </text>
        <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
          Culture Alberta
        </text>
      </svg>
    `)}`)
  }

  const handleLoad = () => {
    setLoading(false)
  }

  if (loading) {
    return (
      <div
        className={`bg-muted animate-pulse flex items-center justify-center ${className}`}
        style={{ width: optimizedWidth || "100%", height: optimizedHeight || "auto" }}
      >
        <svg
          className="w-10 h-10 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    )
  }

  return (
    <Image
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      width={optimizedWidth}
      height={optimizedHeight}
      className={className}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      onError={handleError}
      onLoad={handleLoad}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      {...rest}
    />
  )
}
