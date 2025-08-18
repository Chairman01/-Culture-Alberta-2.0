import React from 'react'
import Image from 'next/image'

interface ArticleContentProps {
  content: string
  className?: string
}

export function ArticleContent({ content, className = "" }: ArticleContentProps) {
  // Function to parse markdown-style images: ![alt text](image-url)
  const parseContentWithImages = (text: string) => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imageRegex.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        })
      }

      // Add the image
      parts.push({
        type: 'image',
        alt: match[1],
        src: match[2]
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      })
    }

    return parts
  }

  // Function to process content and convert YouTube URLs to embedded videos
  const processContentWithVideos = (content: string): string => {
    // Convert YouTube URLs to embedded videos
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g
    
    let processedContent = content.replace(youtubeRegex, (match, videoId) => {
      return `<div class="video-container">
        <iframe 
          width="100%" 
          height="400" 
          src="https://www.youtube.com/embed/${videoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      </div>`
    })

    return processedContent
  }

  // First process videos, then images
  const contentWithVideos = processContentWithVideos(content)
  const contentParts = parseContentWithImages(contentWithVideos)

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {contentParts.map((part, index) => {
        if (part.type === 'text' && part.content) {
          // Check if this text contains video HTML
          if (part.content.includes('<div class="video-container">')) {
            return (
              <div 
                key={index} 
                className="my-8"
                dangerouslySetInnerHTML={{ __html: part.content }}
              />
            )
          }
          
          // Split text into paragraphs and render
          return part.content.split('\n\n').map((paragraph, pIndex) => (
            <p key={`${index}-${pIndex}`} className="mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))
        } else if (part.type === 'image' && part.src) {
          return (
            <div key={index} className="my-8 text-center">
              <div className="relative w-full max-w-4xl mx-auto">
                <Image
                  src={part.src}
                  alt={part.alt || ''}
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                  style={{ objectFit: 'cover' }}
                />
                {part.alt && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {part.alt}
                  </p>
                )}
              </div>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

// Alternative: HTML-style image tags
export function ArticleContentWithHTML({ content, className = "" }: ArticleContentProps) {
  const parseContentWithHTMLImages = (text: string) => {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imgRegex.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        })
      }

      // Add the image
      parts.push({
        type: 'image',
        alt: match[2],
        src: match[1]
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      })
    }

    return parts
  }

  const contentParts = parseContentWithHTMLImages(content)

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {contentParts.map((part, index) => {
        if (part.type === 'text' && part.content) {
          return part.content.split('\n\n').map((paragraph, pIndex) => (
            <p key={`${index}-${pIndex}`} className="mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))
        } else if (part.type === 'image' && part.src) {
          return (
            <div key={index} className="my-8 text-center">
              <div className="relative w-full max-w-4xl mx-auto">
                <Image
                  src={part.src}
                  alt={part.alt || ''}
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                  style={{ objectFit: 'cover' }}
                />
                {part.alt && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {part.alt}
                  </p>
                )}
              </div>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
