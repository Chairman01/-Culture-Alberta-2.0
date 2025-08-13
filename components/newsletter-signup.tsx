"use client"

import { useState, useEffect } from "react"
import { subscribeToNewsletter, testNewsletterConnection } from "@/lib/newsletter"
import { trackNewsletterSignup } from "@/lib/analytics"
import { Instagram, Youtube, Facebook, Twitter } from "lucide-react"

interface NewsletterSignupProps {
  defaultCity?: string
  title?: string
  description?: string
  className?: string
  buttonColor?: string
}

export default function NewsletterSignup({ 
  defaultCity = "", 
  title = "Newsletter",
  description = "Stay updated with the latest cultural news and events from across Alberta.",
  className = "",
  buttonColor = "bg-black hover:bg-gray-800"
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
      setIsConnected(result.success && result.tableExists || false)
      
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
      const result = await subscribeToNewsletter(email, city)
      
      if (result.success) {
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
          className={`w-full ${buttonColor} text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors font-body disabled:opacity-50 disabled:cursor-not-allowed`}
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
          <a href="#" className="text-gray-600 hover:text-black transition-colors">
            <Instagram className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">
            <Youtube className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">
            <Facebook className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">
            <Twitter className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  )
}
