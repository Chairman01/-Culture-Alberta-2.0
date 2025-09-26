"use client"

import { useState, useEffect } from "react"
import { testNewsletterConnection } from "@/lib/newsletter"
import { trackNewsletterSignup } from "@/lib/analytics"
import { Instagram, Youtube, Facebook, Twitter } from "lucide-react"

interface NewsletterSignupProps {
  defaultCity?: string
  title?: string
  description?: string
  className?: string
  compact?: boolean
}

export default function NewsletterSignup({ 
  defaultCity = "", 
  title = "Newsletter",
  description = "Stay updated with the latest cultural news and events from across Alberta.",
  className = "",
  compact = false
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("")
  const [city, setCity] = useState(defaultCity)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      const result = await testNewsletterConnection()
      setIsConnected(Boolean(result.success && result.tableExists))
      
      if (!result.success || !result.tableExists) {
        console.error('Newsletter database not ready:', result.error)
        setMessage("Newsletter system is being set up. Please try again later.")
        setMessageType("error")
      }
    }
    
    testConnection()
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
      // Use API route instead of direct function call
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          city,
          optIn: true,
          source: 'website'
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage("Successfully subscribed to newsletter!")
        setMessageType("success")
        setEmail("")
        setCity(defaultCity)
        
        // Track the signup for analytics
        trackNewsletterSignup(city, email)
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

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select your city</option>
            <option value="Edmonton">Edmonton</option>
            <option value="Calgary">Calgary</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !email}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Subscribing..." : "Subscribe"}
        </button>
        {message && (
          <p className={`text-sm ${messageType === "success" ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
      <p className="font-body text-gray-600 text-sm mb-4 leading-relaxed">
        {description}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <select 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-body"
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-body"
          required
        />
        
        <button 
          type="submit"
          disabled={isSubmitting || isConnected === false}
          className="w-full bg-black text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors font-body disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Subscribing..." : isConnected === false ? "Setting up..." : "Subscribe"}
        </button>
      </form>

      {message && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          messageType === "success" 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* Social Media Links */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2 font-body">Follow us:</p>
        <div className="flex space-x-3">
          <a 
            href="https://www.youtube.com/@CultureAlberta_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-black transition-colors"
            aria-label="YouTube - Culture Alberta"
          >
            <Youtube className="w-5 h-5" />
          </a>
          <a 
            href="https://www.facebook.com/profile.php?id=100064044099295" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-black transition-colors"
            aria-label="Facebook - Culture Alberta"
          >
            <Facebook className="w-5 h-5" />
          </a>
          <a 
            href="https://www.facebook.com/profile.php?id=100072301249690" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-black transition-colors"
            aria-label="Facebook - Culture YYC"
          >
            <Facebook className="w-5 h-5" />
          </a>
          <a 
            href="https://www.instagram.com/culturealberta._/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-black transition-colors"
            aria-label="Instagram - Culture Alberta"
          >
            <Instagram className="w-5 h-5" />
          </a>
          <a 
            href="https://www.instagram.com/cultureyyc._/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-black transition-colors"
            aria-label="Instagram - Culture YYC"
          >
            <Instagram className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  )
}
