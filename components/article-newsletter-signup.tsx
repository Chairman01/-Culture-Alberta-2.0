"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { NEWSLETTER_CITIES } from "@/lib/newsletter-cities"

interface ArticleNewsletterSignupProps {
  articleTitle?: string
  articleCategory?: string
  articleImageUrl?: string
  className?: string
  /** Inline: static in-flow (AdSense-friendly). Fixed: scroll-triggered full-screen modal. */
  variant?: 'inline' | 'fixed'
}

export default function ArticleNewsletterSignup({
  articleTitle = "this article",
  articleCategory = "",
  articleImageUrl,
  className = "",
  variant = 'inline'
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
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, optIn: true, source: 'article' })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setMessage("You're in! Check your inbox for Alberta stories.")
        setMessageType("success")
        setEmail("")
        setCity("")
        localStorage.setItem('newsletter_subscribed', 'true')
        setIsSubscribed(true)
        setTimeout(() => {
          setIsAnimating(false)
          setTimeout(() => setIsVisible(false), 400)
        }, 2500)
      } else {
        setMessage(result.error || "Failed to subscribe. Please try again.")
        setMessageType("error")
      }
    } catch {
      setMessage("An error occurred. Please try again.")
      setMessageType("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => setIsVisible(false), 400)
  }

  if (isSubscribed || !isVisible) return null

  // ── Inline variant ─────────────────────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 rounded-2xl p-6 md:p-8 mt-12 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Enjoying this article?</h3>
            <p className="text-gray-600 text-sm mt-0.5">Get more Alberta stories delivered to your inbox.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
            {NEWSLETTER_CITIES.map(({ value, label }) => (
              <option key={value || 'placeholder'} value={value}>{label}</option>
            ))}
          </select>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
            {isSubmitting ? "Subscribing..." : "Subscribe — it's free"}
          </button>
        </form>
        {message && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message}
          </div>
        )}
        <div className="mt-3 text-center">
          <button onClick={handleDismiss} type="button" className="text-xs text-gray-400 hover:text-gray-600">Not interested</button>
        </div>
      </div>
    )
  }

  // ── Fixed: Patagonia-style split-image modal ────────────────────────────────
  const hasImage = articleImageUrl && !articleImageUrl.startsWith('data:')

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleDismiss} />

      {/* Modal — split layout */}
      <div className={`relative flex w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ease-out ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-6'}`} style={{ maxHeight: '90vh' }}>

        {/* Left panel — article image (desktop only) */}
        {hasImage && (
          <div className="hidden md:block w-[45%] relative flex-shrink-0">
            <Image
              src={articleImageUrl!}
              alt={articleTitle}
              fill
              className="object-cover"
              sizes="40vw"
            />
            {/* Dark gradient overlay at bottom for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
            {/* Brand tag bottom-left */}
            <div className="absolute bottom-5 left-5">
              <span className="text-white font-bold text-sm tracking-wide drop-shadow">Culture Alberta</span>
            </div>
          </div>
        )}

        {/* Right panel — form */}
        <div className={`flex-1 bg-white flex flex-col justify-center px-8 py-10 ${!hasImage ? 'md:px-12' : ''}`}>
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors rounded-full p-1.5 hover:bg-gray-100 z-10"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Branding */}
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">Culture Alberta</p>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-2">
            More Alberta.<br />In Your Inbox.
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            Stories about culture, food, and events from across Alberta — delivered free.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Events &middot; Food &amp; Drink &middot; Culture &middot; Hidden Gems
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
              placeholder="Email Address"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-4 px-4 rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe Free"}
            </button>
          </form>

          {message && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {message}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
