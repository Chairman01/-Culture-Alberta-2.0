"use client"

import { useState, useEffect } from "react"
import { trackNewsletterSignup } from "@/lib/analytics"

interface ArticleNewsletterSignupProps {
  articleTitle?: string
  articleCategory?: string
  className?: string
}

export default function ArticleNewsletterSignup({ 
  articleTitle = "this article",
  articleCategory = "",
  className = ""
}: ArticleNewsletterSignupProps) {
  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Check if user has already subscribed (using localStorage)
  useEffect(() => {
    const subscribed = localStorage.getItem('newsletter_subscribed')
    if (subscribed === 'true') {
      setIsSubscribed(true)
      setIsVisible(false)
    } else {
      // Show newsletter signup after a delay to let user read some content
      const timer = setTimeout(() => {
        setIsVisible(true)
        setIsAnimating(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [])

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
        
        // Track the signup for analytics
        trackNewsletterSignup(city, email)
        
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

  return (
    <>
      {/* Desktop version - Fixed sidebar */}
      <div className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-40 w-80 max-w-[calc(100vw-2rem)] hidden lg:block transition-all duration-500 ease-out ${isAnimating ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'} ${className}`}>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 backdrop-blur-sm bg-white/95">
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Enjoying {articleTitle}?
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Get more Alberta culture stories delivered to your inbox.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <select 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select your city</option>
              <option value="calgary">Calgary</option>
              <option value="edmonton">Edmonton</option>
              <option value="other-alberta">Other Alberta</option>
              <option value="outside-alberta">Outside Alberta</option>
            </select>
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </form>

          {message && (
            <div className={`mt-2 p-2 rounded-lg text-xs ${
              messageType === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <div className="mt-2 text-center">
            <button 
              onClick={handleDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Not interested
            </button>
          </div>
        </div>
      </div>

      {/* Mobile version - Fixed bottom */}
      <div className={`fixed bottom-4 left-4 right-4 z-40 lg:hidden transition-all duration-500 ease-out ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'} ${className}`}>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 backdrop-blur-sm bg-white/95">
          <div className="text-center mb-3">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Enjoying {articleTitle}?
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Get more Alberta culture stories delivered to your inbox.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select city</option>
                <option value="calgary">Calgary</option>
                <option value="edmonton">Edmonton</option>
                <option value="other-alberta">Other Alberta</option>
                <option value="outside-alberta">Outside Alberta</option>
              </select>
              
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </form>

          {message && (
            <div className={`mt-2 p-2 rounded-lg text-xs ${
              messageType === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <div className="mt-2 text-center">
            <button 
              onClick={handleDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Not interested
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
