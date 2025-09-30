import React from 'react'
import Image from 'next/image'

interface ArticleContentProps {
  content: string
  className?: string
}

// Function to process content and convert YouTube URLs to embedded videos
const processContentWithVideos = (content: string): string => {
  // Convert YouTube URLs to embedded videos - improved regex to catch more formats
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?[^&\s]*)?/g
  
  let processedContent = content.replace(youtubeRegex, (match, videoId) => {
    // Clean up video ID (remove any query parameters)
    const cleanVideoId = videoId.split('?')[0].split('&')[0]
    
    return `<div class="video-container my-8 rounded-lg overflow-hidden shadow-lg bg-gray-100">
      <div class="relative w-full" style="padding-bottom: 56.25%;">
        <iframe 
          class="absolute top-0 left-0 w-full h-full"
          src="https://www.youtube.com/embed/${cleanVideoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
        ></iframe>
      </div>
    </div>`
  })

  return processedContent
}

export function ArticleContent({ content, className = "" }: ArticleContentProps) {
  // Check if content is HTML (contains HTML tags)
  const isHTML = /<[^>]+>/.test(content)
  
  // If it's HTML, render it directly with proper styling
  if (isHTML) {
    return (
      <div 
        className={`article-content prose prose-lg max-w-none ${className}`}
        dangerouslySetInnerHTML={{ 
          __html: processContentWithVideos(content)
            .replace(/<ul>/g, '<ul class="space-y-2 mb-6">')
            .replace(/<ol>/g, '<ol class="space-y-2 mb-6">')
            .replace(/<li>/g, '<li class="flex items-start text-gray-700 leading-relaxed"><span class="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span><span class="flex-1">')
            .replace(/<\/li>/g, '</span></li>')
            .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-r-lg">')
            .replace(/<p>/g, '<p class="mb-6 leading-relaxed text-gray-700 text-lg">')
            .replace(/<strong>/g, '<strong class="font-semibold text-gray-900">')
            .replace(/<em>/g, '<em class="italic text-gray-800">')
            .replace(/<img([^>]*)>/g, '<img$1 class="rounded-lg shadow-lg my-8 max-w-full h-auto">')
            .replace(/<span style="font-family:([^"]+)"/g, '<span style="font-family:$1"')
            .replace(/<span style="font-size:([^"]+)"/g, '<span style="font-size:$1"')
            .replace(/<div class="video-container">/g, '<div class="video-container my-8 rounded-lg overflow-hidden shadow-lg">')
        }}
      />
    )
  }

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


  // Function to process text content with proper formatting
  const processTextContent = (text: string) => {
    // Split into paragraphs, preserving single line breaks within paragraphs
    const paragraphs = text.split('\n\n').map(paragraph => paragraph.trim()).filter(p => p.length > 0)
    
    return paragraphs.map((paragraph, index) => {
      // Handle quotes (text wrapped in quotes)
      if (/^["'].*["']$/.test(paragraph)) {
        const quoteText = paragraph.replace(/^["']|["']$/g, '')
        return (
          <blockquote key={index} className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-r-lg">
            <p className="text-lg italic text-gray-700 font-medium leading-relaxed">
              "{quoteText}"
            </p>
          </blockquote>
        )
      }
      
      // Handle bullet points (lines starting with -, *, or •)
      if (/^[\-\*\•]\s/.test(paragraph)) {
        const bulletItems = paragraph.split('\n').filter(line => line.trim().length > 0)
        // Only treat as bullet list if there are multiple bullet items
        if (bulletItems.length > 1) {
          return (
            <ul key={index} className="mb-6 space-y-2">
              {bulletItems.map((item, itemIndex) => {
                const cleanItem = item.replace(/^[\-\*\•]\s/, '').trim()
                return (
                  <li key={itemIndex} className="flex items-start">
                    <span className="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span>
                    <span className="text-gray-700 leading-relaxed flex-1">
                      {formatInlineText(cleanItem)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        } else {
          // Single bullet item - treat as regular paragraph
          const cleanItem = paragraph.replace(/^[\-\*\•]\s/, '').trim()
          return (
            <p key={index} className="mb-6 leading-relaxed text-gray-700 text-lg">
              {formatInlineText(cleanItem)}
            </p>
          )
        }
      }
      
      // Handle numbered lists (lines starting with numbers followed by space)
      if (/^\d+\.\s/.test(paragraph)) {
        const listItems = paragraph.split('\n').filter(line => line.trim().length > 0)
        // Only treat as a list if there are multiple numbered items
        if (listItems.length > 1) {
          return (
            <ol key={index} className="mb-6 space-y-2 list-decimal list-inside">
              {listItems.map((item, itemIndex) => {
                const cleanItem = item.replace(/^\d+\.\s/, '').trim()
                return (
                  <li key={itemIndex} className="text-gray-700 leading-relaxed">
                    {formatInlineText(cleanItem)}
                  </li>
                )
              })}
            </ol>
          )
        } else {
          // Single numbered item - treat as a heading
          const cleanItem = paragraph.replace(/^\d+\.\s/, '').trim()
          return (
            <h3 key={index} className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              {cleanItem}
            </h3>
          )
        }
      }
      
      // Handle numbered lists (main headings)
      if (/^\d+\./.test(paragraph)) {
        return (
          <h2 key={index} className="text-2xl font-bold text-gray-900 mb-4 mt-8 first:mt-0">
            {paragraph}
          </h2>
        )
      }
      
      // Handle "What it is:", "Why locals love it:", etc. (highlight boxes)
      if (/^(What it is|Why locals love it|Pro tip|Vibe|Try this|Heads-up|Must-try|Key Takeaway|Important|Note):/.test(paragraph)) {
        const [label, ...rest] = paragraph.split(':')
        return (
          <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6 rounded-r-lg">
            <strong className="text-gray-900 text-lg font-semibold">{label}:</strong>
            <span className="text-gray-700 ml-2">{rest.join(':').trim()}</span>
          </div>
        )
      }
      
      // Handle "Honorable Mentions:" and "Bottom line:" (section headers)
      if (/^(Honorable Mentions|Bottom line|Conclusion|Summary|Final Thoughts):/.test(paragraph)) {
        return (
          <h3 key={index} className="text-xl font-semibold text-gray-900 mt-8 mb-4 border-b-2 border-gray-200 pb-2">
            {paragraph}
          </h3>
        )
      }
      
      // Handle subheadings (text ending with :)
      if (/^[A-Z][^:]*:$/.test(paragraph) && paragraph.length < 100) {
        return (
          <h4 key={index} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
            {paragraph}
          </h4>
        )
      }
      
      // Handle regular paragraphs with inline formatting and preserve line breaks
      return (
        <div key={index} className="mb-6 leading-relaxed text-gray-700 text-lg">
          {paragraph.split('\n').map((line, lineIndex) => {
            const trimmedLine = line.trim()
            
            // Check if this line looks like a heading (ends with colon and is short)
            if (trimmedLine.endsWith(':') && trimmedLine.length < 100 && !trimmedLine.includes('.')) {
              return (
                <h4 key={lineIndex} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
                  {trimmedLine}
                </h4>
              )
            }
            
            // Check if this line looks like a bullet point (starts with common bullet indicators)
            if (/^[\-\*\•]\s/.test(trimmedLine)) {
              const cleanItem = trimmedLine.replace(/^[\-\*\•]\s/, '').trim()
              return (
                <div key={lineIndex} className="flex items-start mt-2">
                  <span className="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span>
                  <span className="text-gray-700 leading-relaxed flex-1">
                    {formatInlineText(cleanItem)}
                  </span>
                </div>
              )
            }
            
            // Regular paragraph
            return (
              <p key={lineIndex} className={lineIndex > 0 ? "mt-2" : ""}>
                {formatInlineText(line)}
              </p>
            )
          })}
        </div>
      )
    })
  }

  // Function to format inline text (bold, italic, etc.)
  const formatInlineText = (text: string) => {
    // Preserve multiple spaces by converting them to non-breaking spaces
    text = text.replace(/  +/g, (match) => '&nbsp;'.repeat(match.length))
    
    // Handle **bold** text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Handle *italic* text
    text = text.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
    
    // Handle `code` text
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
    
    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }

  // First process videos, then images
  const contentWithVideos = processContentWithVideos(content)
  const contentParts = parseContentWithImages(contentWithVideos)

  return (
    <div className={`article-content ${className}`}>
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
          
          // Process text content with proper formatting
          return processTextContent(part.content)
        } else if (part.type === 'image' && part.src) {
          return (
            <div key={index} className="my-8 text-center">
              <div className="relative w-full max-w-4xl mx-auto">
                <Image
                  src={part.src as string}
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
    <div className={`article-content ${className}`}>
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
                  src={part.src as string}
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
