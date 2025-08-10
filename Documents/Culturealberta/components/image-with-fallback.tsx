"use client"

import type React from "react"

import { useState } from "react"
import type Image from "next/image"

interface ImageWithFallbackProps {
  src: string
  fallbackSrc: string
  alt: string
  width: number
  height: number
  className?: string
}

export function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  className,
  ...rest
}: ImageWithFallbackProps & Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "width" | "height">) {
  const [imgSrc, setImgSrc] = useState(src)
  const [imgWidth, setImgWidth] = useState(width)
  const [imgHeight, setImgHeight] = useState(height)

  return (
    <img
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      width={imgWidth}
      height={imgHeight}
      className={className}
      onError={() => {
        setImgSrc(fallbackSrc)
      }}
      {...rest}
    />
  )
}
