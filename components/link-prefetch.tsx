/**
 * Link Prefetch Component
 * 
 * Automatically prefetches links on hover for instant navigation
 * 
 * Performance optimizations:
 * - Prefetches on hover (not on mount)
 * - Only prefetches visible links
 * - Uses Next.js prefetch API
 * - Reduces perceived load time
 */

"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface LinkPrefetchProps {
  href: string
  children: React.ReactNode
  className?: string
  prefetch?: boolean
}

/**
 * Link component with automatic prefetching on hover
 * 
 * @param href - Link destination
 * @param children - Link content
 * @param className - CSS classes
 * @param prefetch - Whether to enable prefetching (default: true)
 */
export function LinkPrefetch({ 
  href, 
  children, 
  className = '',
  prefetch = true 
}: LinkPrefetchProps) {
  const router = useRouter()
  const linkRef = useRef<HTMLAnchorElement>(null)
  const prefetchedRef = useRef(false)

  useEffect(() => {
    if (!prefetch || !linkRef.current || prefetchedRef.current) return

    const link = linkRef.current

    // Prefetch on hover (faster than on mount)
    const handleMouseEnter = () => {
      if (!prefetchedRef.current && href.startsWith('/')) {
        router.prefetch(href)
        prefetchedRef.current = true
      }
    }

    // Also prefetch if link is visible in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetchedRef.current && href.startsWith('/')) {
            router.prefetch(href)
            prefetchedRef.current = true
          }
        })
      },
      { rootMargin: '50px' } // Prefetch when 50px away from viewport
    )

    link.addEventListener('mouseenter', handleMouseEnter)
    observer.observe(link)

    return () => {
      link.removeEventListener('mouseenter', handleMouseEnter)
      observer.disconnect()
    }
  }, [href, router, prefetch])

  return (
    <a
      ref={linkRef}
      href={href}
      className={className}
    >
      {children}
    </a>
  )
}

