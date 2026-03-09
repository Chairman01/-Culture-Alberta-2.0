"use client"

import { useState, useEffect } from "react"
import { Mail } from "lucide-react"
import { NEWSLETTER_CITIES } from "@/lib/newsletter-cities"

interface ArticleNewsletterSignupProps {
  articleTitle?: string
  articleCategory?: string
  className?: string
  /** Inline: static in-flow (AdSense-friendly). Fixed: floating overlay (can compete with ads). */
  variant?: 'inline' | 'fixed'
}

export default function ArticleNewsletterSignup({ 
  articleTitle = "this article",
  articleCategory = "",
  className = "",
  variant = 'inline' // Default inline to avoid overlapping AdSense ads
}: ArticleNewsletterSignupProps) {
  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Inline: always show. Fixed: show after scrolling 50% through the article
  useEffect(() => {
    const subscribed = localStorage.getItem('newsletter_subscribed')
    if (subscribed === 'true') {
      setIsSubscribed(true)
      setIsVisible(false)
      return
    }

    if (variant === 'inline') {
      setIsVisible(true)
      setIsAnimating(true)
      return
    }

    // Scroll-triggered: appear when reader reaches 50% of article content
    const handleScroll = () => {
      const article = document.querySelector('.article-content') as HTMLElement | null
      if (!article) return
      const articleTop = article.getBoundingClientRect().top + window.scrollY
      const articleHeight = article.offsetHeight
      const scrolled = window.scrollY + window.innerHeight
      const progress = (scrolled - articleTop) / articleHeight
      if (progress >= 0.5) {
        setIsVisible(true)
        setIsAnimating(true)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !city) {
      setMessage("Please fill in all fields")
      setMessageType("error")
      return
    }

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address")
      setMessageType("error")
      return
    }

    setIsSubmitting(true)
    setMessage("")

    try {
      // Use API route for newsletter signup
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          city,
          optIn: true,
          source: 'article'
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage("Thanks for subscribing! You'll get the latest Alberta culture news.")
        setMessageType("success")
        setEmail("")
        setCity("")
        
        // Mark as subscribed in localStorage
        localStorage.setItem('newsletter_subscribed', 'true')
        setIsSubscribed(true)
        
        // Newsletter signup successful
        
        // Hide the component after a delay with animation
        setTimeout(() => {
          setIsAnimating(false)
          setTimeout(() => {
            setIsVisible(false)
          }, 500) // Wait for animation to complete
        }, 3000)
      } else {
        setMessage(result.error || "Failed to subscribe")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.")
      setMessageType("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
    }, 500) // Wait for animation to complete
  }

  // Don't render if already subscribed or not visible yet
  if (isSubscribed || !isVisible) {
    return null
  }

  const formContent = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Enjoying {articleTitle}?
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mt-0.5">
            Get more Alberta culture stories delivered to your inbox.
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <select 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          required
        >
          {NEWSLETTER_CITIES.map(({ value, label }) => (
            <option key={value || 'placeholder'} value={value}>{label}</option>
          ))}
        </select>
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          required
        />
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
        >
          {isSubmitting ? "Subscribing..." : "Subscribe"}
        </button>
      </form>

      {message && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${
          messageType === "success" 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      <div className="mt-3 text-center">
        <button 
          onClick={handleDismiss}
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Not interested
        </button>
      </div>
    </>
  )

  // Inline: static block at end of article (AdSense-friendly - no overlap)
  if (variant === 'inline') {
    return (
      <div className={`bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 rounded-2xl p-6 md:p-8 mt-12 shadow-sm ${className}`}>
        {formContent}
      </div>
    )
  }

  // Fixed: centered modal popup with backdrop (highest converting format)
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter signup"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal card */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-7 transition-all duration-300 ease-out ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Alberta flag accent bar */}
        <div className="flex gap-1 mb-5">
          <div className="h-1 w-8 rounded-full bg-blue-600" />
          <div className="h-1 w-3 rounded-full bg-blue-300" />
        </div>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 leading-snug">
              Enjoying this article?
            </h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Get the best Alberta stories delivered to your inbox — free, no spam.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
            required
          >
            {NEWSLETTER_CITIES.map(({ value, label }) => (
              <option key={value || 'placeholder'} value={value}>{label}</option>
            ))}
          </select>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isSubmitting ? "Subscribing..." : "Subscribe — it's free"}
          </button>
        </form>

        {message && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>
    </div>
  )
}
