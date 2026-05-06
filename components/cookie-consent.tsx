'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [hasDecided, setHasDecided] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            setShowBanner(true)
        } else {
            setHasDecided(true)
        }
    }, [])

    useEffect(() => {
        if (hasDecided) return

        const handleScroll = () => {
            const scrolled = window.scrollY
            const total = document.documentElement.scrollHeight - window.innerHeight
            const pct = total > 0 ? scrolled / total : 0
            if (pct >= 0.5) {
                setShowModal(true)
                window.removeEventListener('scroll', handleScroll)
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [hasDecided])

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted')
        setShowBanner(false)
        setShowModal(false)
        setHasDecided(true)
    }

    const declineCookies = () => {
        localStorage.setItem('cookie-consent', 'declined')
        setShowBanner(false)
        setShowModal(false)
        setHasDecided(true)
    }

    return (
        <>
            {showBanner && (
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
            )}

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Support free local journalism</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Accepting cookies helps us keep Culture Alberta free to read. We never sell your data.{' '}
                            <Link href="/privacy-policy" className="underline text-blue-600">
                                Learn more
                            </Link>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={declineCookies}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Decline
                            </button>
                            <button
                                onClick={acceptCookies}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
