"use client"

import { useState, useEffect } from "react"

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
    }
  }, [src, isTheaterImage])

  const handleError = () => {
    console.error(`Failed to load image: ${src}`)
    setError(true)
    setLoading(false)
    // Use a placeholder with the correct dimensions
    setImgSrc(`/placeholder.svg?height=${height}&width=${width}`)
  }

  const handleLoad = () => {
    setLoading(false)
  }

  if (loading) {
    return (
      <div
        className={`bg-muted animate-pulse flex items-center justify-center ${className}`}
        style={{ width: width || "100%", height: height || "auto" }}
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
    <img
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  )
}
