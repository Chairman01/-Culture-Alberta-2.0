'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
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
        <div className="fixed top-0 left-0 right-0 z-[200] bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <span className="text-white text-[7px] font-black leading-none">CA</span>
                    </span>
                    <p className="text-sm text-gray-700 truncate">
                        <span className="font-semibold text-gray-900">Culture Alberta</span>
                        {' '}is free to read — cookies help us keep it that way.{' '}
                        <Link href="/privacy-policy" className="text-gray-500 underline hover:text-gray-900 whitespace-nowrap">
                            Learn more
                        </Link>
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={declineCookies}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                    >
                        Decline
                    </button>
                    <button
                        onClick={acceptCookies}
                        className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white rounded-full text-xs font-semibold transition-colors"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    )
}
