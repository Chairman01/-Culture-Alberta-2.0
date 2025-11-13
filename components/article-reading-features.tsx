"use client"

import { useState, useEffect } from 'react'
import NewsletterSignup from './newsletter-signup'

export function ArticleReadingFeatures() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showStickyNewsletter, setShowStickyNewsletter] = useState(false)

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      setScrollProgress(progress)

      // Show sticky newsletter after scrolling 30% of the article
      setShowStickyNewsletter(scrollTop > window.innerHeight * 0.3)
    }

    window.addEventListener('scroll', updateScrollProgress)
    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  return (
    <>
      {/* Scroll Progress Bar - Update the existing one */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const progressBar = document.getElementById('header-reading-progress');
              if (progressBar) {
                const updateProgress = () => {
                  const scrollTop = window.scrollY;
                  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                  const progress = (scrollTop / docHeight) * 100;
                  progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
                };
                window.addEventListener('scroll', updateProgress);
              }
            });
          `,
        }}
      />

      {/* Sticky Newsletter Signup */}
      {showStickyNewsletter && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
              <button
                onClick={() => setShowStickyNewsletter(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Get the latest cultural stories and events delivered to your inbox.
            </p>
            <NewsletterSignup 
              title=""
              description=""
              defaultCity=""
              compact={true}
            />
          </div>
        </div>
      )}
    </>
  )
}
