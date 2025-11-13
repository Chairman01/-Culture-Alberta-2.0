"use client"

import { useState } from "react"

interface SimpleImageProps {
  alt: string
  width?: number
  height?: number
  className?: string
}

export function SimpleImage({ alt, width = 800, height = 450, className = "", ...rest }: SimpleImageProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Generate a placeholder URL with the correct dimensions
  const placeholderUrl = `/placeholder.svg?height=${height}&width=${width}`

  return (
    <img
      src={placeholderUrl || "/placeholder.svg"}
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...rest}
    />
  )
}
