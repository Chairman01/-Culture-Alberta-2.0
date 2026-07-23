'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, AlertCircle, X, User } from 'lucide-react'
import { useCurrentUser } from '@/lib/use-current-user'

interface CommentFormProps {
    articleId: string
    onCommentSubmitted?: () => void
}

function initialsOf(name: string): string {
    const w = name.trim().split(/\s+/)
    if (w.length >= 2 && w[0] && w[1]) return (w[0][0] + w[1][0]).toUpperCase()
    return name.trim().substring(0, 2).toUpperCase() || '?'
}

export function CommentForm({ articleId, onCommentSubmitted }: CommentFormProps) {
    const { user, accessToken } = useCurrentUser()
    const isLoggedIn = !!user

    const [content, setContent] = useState('')
    const [focused, setFocused] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [showAuthGate, setShowAuthGate] = useState(false)

    const [authHref, setAuthHref] = useState({ signin: '/auth/signin', signup: '/auth/signup' })

    const draftKey = `comment-draft:${articleId}`

    // Build sign in/up links that return to this article, and restore any draft
    // saved before the reader left to create an account.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const next = encodeURIComponent(window.location.pathname)
            setAuthHref({
                signin: `/auth/signin?next=${next}`,
                signup: `/auth/signup?next=${next}`,
            })

            try {
                const saved = window.sessionStorage.getItem(draftKey)
                if (saved) {
                    setContent(saved)
                    setFocused(true)
                    window.sessionStorage.removeItem(draftKey)
                }
            } catch {
                /* sessionStorage unavailable — ignore */
            }
        }
    }, [draftKey])

    // Poll → comments funnel: after voting, the poll card scrolls here and
    // hands over a conversation starter so the box is never blank.
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { option?: string } | undefined
            if (!detail?.option) return
            setContent(prev => (prev.trim() ? prev : `I voted "${detail.option}" because `))
            setFocused(true)
            setTimeout(() => {
                const el = document.getElementById('comment-composer') as HTMLTextAreaElement | null
                if (el) {
                    el.focus()
                    el.setSelectionRange(el.value.length, el.value.length)
                }
            }, 700)
        }
        window.addEventListener('ca:poll-comment', handler)
        return () => window.removeEventListener('ca:poll-comment', handler)
    }, [])

    // Auto-dismiss success message
    useEffect(() => {
        if (message?.type === 'success') {
            const t = setTimeout(() => setMessage(null), 5000)
            return () => clearTimeout(t)
        }
    }, [message])

    const memberName =
        ((user?.user_metadata as { full_name?: string } | undefined)?.full_name) ||
        user?.email ||
        'You'

    const expanded = focused || content.length > 0

    const postComment = async () => {
        const text = content.trim()
        setSubmitting(true)
        setMessage(null)
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (accessToken) headers.Authorization = `Bearer ${accessToken}`

            const res = await fetch('/api/comments', {
                method: 'POST',
                headers,
                body: JSON.stringify({ articleId, content: text }),
            })
            const data = await res.json()

            if (res.ok) {
                setContent('')
                setFocused(false)
                setMessage({ type: 'success', text: 'Your comment has been posted.' })
                onCommentSubmitted?.()
            } else {
                const errText = data.error || 'Failed to post comment. Please try again.'
                setMessage({ type: 'error', text: errText })
            }
        } catch {
            setMessage({ type: 'error', text: 'An error occurred. Please check your connection and try again.' })
        } finally {
            setSubmitting(false)
        }
    }

    const handlePostClick = () => {
        const text = content.trim()
        if (text.length < 3) {
            setMessage({ type: 'error', text: 'Comment must be at least 3 characters.' })
            return
        }
        if (text.length > 1000) {
            setMessage({ type: 'error', text: 'Comment must be less than 1000 characters.' })
            return
        }
        if (isLoggedIn) {
            postComment()
        } else {
            setShowAuthGate(true)
        }
    }

    // Stash the in-progress comment so it can be restored after the reader
    // returns from creating an account / signing in.
    const saveDraft = () => {
        try {
            const text = content.trim()
            if (text) window.sessionStorage.setItem(draftKey, text)
        } catch {
            /* sessionStorage unavailable — ignore */
        }
    }

    const handleCancel = () => {
        setContent('')
        setFocused(false)
        setMessage(null)
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">Conversation</h3>
                {isLoggedIn ? (
                    <span className="text-sm text-gray-500">
                        Signed in as <span className="font-semibold text-gray-700">{memberName}</span>
                    </span>
                ) : (
                    <div className="text-xs sm:text-sm font-semibold tracking-wide text-blue-600">
                        <Link href={authHref.signin} className="hover:underline">LOG IN</Link>
                        <span className="mx-2 text-gray-300">|</span>
                        <Link href={authHref.signup} className="hover:underline">SIGN UP</Link>
                    </div>
                )}
            </div>

            {/* Composer */}
            <div className="flex gap-3 mt-4">
                <div className="flex-shrink-0">
                    {isLoggedIn ? (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                            {initialsOf(memberName)}
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div
                        className={`rounded-lg bg-white border transition-all ${
                            expanded ? 'border-gray-300 shadow-sm' : 'border-gray-200'
                        }`}
                    >
                        <textarea
                            id="comment-composer"
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value)
                                if (message) setMessage(null)
                            }}
                            onFocus={() => setFocused(true)}
                            placeholder="Join the discussion…"
                            rows={expanded ? 3 : 1}
                            maxLength={1000}
                            disabled={submitting}
                            className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none text-gray-800 placeholder-gray-400"
                        />

                        {expanded && (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                <span className="text-xs text-gray-400 pl-1">{content.length}/1000</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        disabled={submitting}
                                        className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePostClick}
                                        disabled={submitting || content.trim().length === 0}
                                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        POST
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inline success / error */}
            {message && (
                <div
                    className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                        message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Sign-up-required popup */}
            {showAuthGate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => !submitting && setShowAuthGate(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setShowAuthGate(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-1">Create an account to comment</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Join the conversation by creating a free account. Your comment is saved and
                            will be posted as soon as you’re signed in.
                        </p>

                        <Link
                            href={authHref.signup}
                            onClick={saveDraft}
                            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                        >
                            Create a free account
                        </Link>

                        <div className="flex items-center gap-3 my-4">
                            <span className="h-px bg-gray-200 flex-1" />
                            <span className="text-xs text-gray-400 font-medium">OR</span>
                            <span className="h-px bg-gray-200 flex-1" />
                        </div>

                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                href={authHref.signin}
                                onClick={saveDraft}
                                className="font-semibold text-blue-600 hover:underline"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
