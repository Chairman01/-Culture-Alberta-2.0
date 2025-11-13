/**
 * Reading Progress Component
 * 
 * Client-side component that shows reading progress bar
 * 
 * Performance:
 * - Uses requestAnimationFrame for smooth updates
 * - Throttles scroll events
 * - Lightweight DOM manipulation
 * 
 * Used in:
 * - app/articles/[slug]/page.tsx (article detail page)
 */

'use client'

import { useEffect, useRef } from 'react'

/**
 * ReadingProgress Component
 * 
 * Displays a progress bar showing how much of the article has been read
 * 
 * @param articleContentSelector - CSS selector for article content element (default: '.article-content')
 */
export function ReadingProgress({ 
  articleContentSelector = '.article-content' 
}: { 
  articleContentSelector?: string 
}) {
  const progressBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // PERFORMANCE: Throttle scroll events using requestAnimationFrame
    let rafId: number | null = null
    let lastProgress = 0

    const updateProgress = () => {
      const article = document.querySelector(articleContentSelector)
      if (!article || !progressBarRef.current) {
        return
      }

      const articleTop = (article as HTMLElement).offsetTop
      const articleHeight = (article as HTMLElement).offsetHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      let progress = 0
      if (scrollTop >= articleTop) {
        const scrolled = Math.min(scrollTop - articleTop, articleHeight)
        progress = Math.min((scrolled / articleHeight) * 100, 100)
      }

      // PERFORMANCE: Only update DOM if progress changed significantly (reduces repaints)
      if (Math.abs(progress - lastProgress) > 0.5) {
        progressBarRef.current.style.width = `${progress}%`
        lastProgress = progress
      }

      rafId = null
    }

    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(updateProgress)
      }
    }

    // Initial progress update
    updateProgress()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [articleContentSelector])

  return (
    <div className="w-full bg-gray-200 rounded-full h-1">
      <div
        ref={progressBarRef}
        className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
        style={{ width: '0%' }}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />
    </div>
  )
}


