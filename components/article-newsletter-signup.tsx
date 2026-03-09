"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { NEWSLETTER_CITIES } from "@/lib/newsletter-cities"
import { useAuth } from "@/components/auth-provider"

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
  const { user } = useAuth()

  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  // 'newsletter' | 'account' — which step to show
  const [step, setStep] = useState<'newsletter' | 'account'>('newsletter')
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // If already signed in, never show anything
    if (user) return

    if (variant === 'inline') {
      // Inline: check if they've already subscribed to newsletter
      const subscribed = localStorage.getItem('newsletter_subscribed')
      if (subscribed === 'true') {
        // They subscribed but haven't made an account — show account CTA inline
        setStep('account')
      }
      setIsVisible(true)
      setIsAnimating(true)
      return
    }

    // Fixed popup: show on every article visit at 50% scroll
    // (dismiss only hides for this page — never persisted to localStorage)
    const handleScroll = () => {
      const article = document.querySelector('.article-content') as HTMLElement | null
      if (!article) return
      const articleTop = article.getBoundingClientRect().top + window.scrollY
      const articleHeight = article.offsetHeight
      const scrolled = window.scrollY + window.innerHeight
      const progress = (scrolled - articleTop) / articleHeight
      if (progress >= 0.5) {
        // Check what step to show
        const subscribed = localStorage.getItem('newsletter_subscribed')
        setStep(subscribed === 'true' ? 'account' : 'newsletter')
        setIsVisible(true)
        setIsAnimating(true)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant, user])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !city) { setError("Please fill in all fields"); return }
    if (!email.includes("@")) { setError("Please enter a valid email address"); return }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, optIn: true, source: 'article' })
      })
      const result = await response.json()

      if (response.ok && result.success) {
        localStorage.setItem('newsletter_subscribed', 'true')
        // Transition to account creation CTA
        setStep('account')
      } else {
        setError(result.error || "Failed to subscribe. Please try again.")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismiss = () => {
    // Dismiss only hides for this page — no localStorage — so it shows again next article
    setIsAnimating(false)
    setTimeout(() => setIsVisible(false), 400)
  }

  // Signed-in users never see this
  if (user) return null
  if (!isVisible) return null

  const hasImage = articleImageUrl && !articleImageUrl.startsWith('data:')

  // ── Account CTA panel (shown after subscribing, or if already subscribed) ──
  const accountCTA = (
    <div className="text-center py-2">
      <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">You're subscribed!</h3>
      <p className="text-gray-500 text-sm mb-5">
        Create a free account to comment on articles, save your favourites, and get content personalised to your city.
      </p>
      <Link
        href="/auth/signup"
        className="block w-full bg-gray-900 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-black transition-all text-center"
        onClick={handleDismiss}
      >
        Create a Free Account
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Maybe later
      </button>
    </div>
  )

  // ── Newsletter form panel ────────────────────────────────────────────────────
  const newsletterForm = (
    <>
      <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">Culture Alberta</p>
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-2">
        More Alberta.<br />In Your Inbox.
      </h2>
      <p className="text-gray-500 text-sm mb-1">
        Stories about culture, food, and events — delivered free.
      </p>
      <p className="text-gray-400 text-xs mb-6">
        Events &middot; Food &amp; Drink &middot; Culture &middot; Hidden Gems
      </p>

      <form onSubmit={handleSubscribe} className="space-y-3">
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
        {error && (
          <p className="text-red-600 text-xs">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white py-4 px-4 rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-50 tracking-wide"
        >
          {isSubmitting ? "Subscribing..." : "Subscribe Free"}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-400">No spam, ever. Unsubscribe anytime.</p>
    </>
  )

  // ── Inline variant ─────────────────────────────────────────────────────────
  if (variant === 'inline') {
    if (step === 'account') {
      return (
        <div className={`bg-gradient-to-br from-green-50 to-blue-50/50 border border-green-200/80 rounded-2xl p-6 md:p-8 mt-12 shadow-sm ${className}`}>
          {accountCTA}
        </div>
      )
    }
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
        <form onSubmit={handleSubscribe} className="space-y-3">
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
            {NEWSLETTER_CITIES.map(({ value, label }) => (
              <option key={value || 'placeholder'} value={value}>{label}</option>
            ))}
          </select>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
            {isSubmitting ? "Subscribing..." : "Subscribe — it's free"}
          </button>
        </form>
        <div className="mt-3 text-center">
          <button onClick={handleDismiss} type="button" className="text-xs text-gray-400 hover:text-gray-600">Not interested</button>
        </div>
      </div>
    )
  }

  // ── Fixed: Patagonia-style split-image modal ────────────────────────────────
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleDismiss} />

      {/* Modal */}
      <div className={`relative flex w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ease-out ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-6'}`} style={{ maxHeight: '90vh' }}>

        {/* Left panel — article image (desktop, newsletter step only) */}
        {hasImage && step === 'newsletter' && (
          <div className="hidden md:block w-[45%] relative flex-shrink-0">
            <Image src={articleImageUrl!} alt={articleTitle} fill className="object-cover" sizes="40vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
            <div className="absolute bottom-5 left-5">
              <span className="text-white font-bold text-sm tracking-wide drop-shadow">Culture Alberta</span>
            </div>
          </div>
        )}

        {/* Right panel */}
        <div className={`flex-1 bg-white flex flex-col justify-center px-8 py-10 ${step === 'account' ? 'md:px-12' : ''}`}>
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

          {step === 'newsletter' ? newsletterForm : accountCTA}
        </div>
      </div>
    </div>
  )
}
