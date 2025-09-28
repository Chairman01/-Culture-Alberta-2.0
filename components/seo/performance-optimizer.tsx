"use client"

import { useEffect } from 'react'

export function PerformanceOptimizer() {
  useEffect(() => {
    // Optimize images for better Core Web Vitals
    const optimizeImages = () => {
      const images = document.querySelectorAll('img')
      images.forEach((img) => {
        // Add loading="lazy" to images below the fold
        if (!img.hasAttribute('loading')) {
          const rect = img.getBoundingClientRect()
          if (rect.top > window.innerHeight) {
            img.setAttribute('loading', 'lazy')
          }
        }
        
        // Add decoding="async" for better performance
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async')
        }
        
        // Ensure proper alt text for accessibility and SEO
        if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
          img.setAttribute('alt', 'Culture Alberta image')
        }
      })
    }

    // Optimize fonts for better LCP
    const optimizeFonts = () => {
      // Only preload fonts that actually exist
      // Check if the font file exists before preloading
      const fontUrl = '/fonts/inter-var.woff2'
      fetch(fontUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            const fontPreload = document.createElement('link')
            fontPreload.rel = 'preload'
            fontPreload.href = fontUrl
            fontPreload.as = 'font'
            fontPreload.type = 'font/woff2'
            fontPreload.crossOrigin = 'anonymous'
            document.head.appendChild(fontPreload)
          }
        })
        .catch(() => {
          // Font doesn't exist, skip preloading
          console.log('Font file not found, skipping preload')
        })
    }

    // Optimize third-party scripts
    const optimizeThirdPartyScripts = () => {
      // Defer non-critical scripts
      const scripts = document.querySelectorAll('script[src]')
      scripts.forEach((script) => {
        if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
          const src = script.getAttribute('src')
          if (src && !src.includes('googletagmanager') && !src.includes('analytics')) {
            script.setAttribute('defer', 'true')
          }
        }
      })
    }

    // Add resource hints for better performance
    const addResourceHints = () => {
      // Preconnect to external domains
      const domains = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com'
      ]
      
      domains.forEach((domain) => {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = domain
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      })
    }

    // Optimize CSS delivery
    const optimizeCSS = () => {
      // Add critical CSS inline for above-the-fold content
      const criticalCSS = `
        body { font-family: system-ui, -apple-system, sans-serif; }
        .loading-spinner { display: none; }
        .main-navigation { position: sticky; top: 0; z-index: 50; }
      `
      
      const style = document.createElement('style')
      style.textContent = criticalCSS
      document.head.appendChild(style)
    }

    // Run optimizations
    optimizeImages()
    optimizeFonts()
    optimizeThirdPartyScripts()
    addResourceHints()
    optimizeCSS()

    // Re-optimize images when new content loads
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.tagName === 'IMG' || element.querySelector('img')) {
                setTimeout(optimizeImages, 100)
              }
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

// Component for optimizing article images specifically
export function ArticleImageOptimizer({ src, alt, className = "" }: { 
  src: string
  alt: string
  className?: string 
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        objectFit: 'cover'
      }}
      onError={(e) => {
        // Fallback to default image if loading fails
        const target = e.target as HTMLImageElement
        target.src = '/images/culture-alberta-og.jpg'
        target.alt = 'Culture Alberta'
      }}
    />
  )
}
