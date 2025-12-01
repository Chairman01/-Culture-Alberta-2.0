'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            setShowBanner(true)
        }
    }, [])

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted')
        setShowBanner(false)
    }

    const declineCookies = () => {
        localStorage.setItem('cookie-consent', 'declined')
        setShowBanner(false)
    }

    if (!showBanner) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 shadow-lg">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">🍪 We Use Cookies</h3>
                        <p className="text-sm text-gray-300">
                            We use cookies and similar technologies to enhance your browsing experience,
                            analyze site traffic, and display personalized advertisements through Google AdSense.
                            By clicking "Accept", you consent to our use of cookies.{' '}
                            <Link href="/privacy-policy" className="underline hover:text-white">
                                Learn more
                            </Link>
                        </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <button
                            onClick={declineCookies}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            Decline
                        </button>
                        <button
                            onClick={acceptCookies}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Accept All Cookies
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
