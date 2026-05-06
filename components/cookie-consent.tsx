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
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white py-2 px-4 shadow-md">
            <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
                <p className="text-sm text-gray-300">
                    We use cookies to improve your experience.{' '}
                    <Link href="/privacy-policy" className="underline hover:text-white">
                        Learn more
                    </Link>
                </p>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={declineCookies}
                        className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={acceptCookies}
                        className="px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    )
}
