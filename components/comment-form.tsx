'use client'

import { useState, useEffect } from 'react'
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface CommentFormProps {
    articleId: string
    onCommentSubmitted?: () => void
}

export function CommentForm({ articleId, onCommentSubmitted }: CommentFormProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [nameError, setNameError] = useState('')
    const [emailError, setEmailError] = useState('')
    const [contentError, setContentError] = useState('')

    // Auto-dismiss success message after 5 seconds
    useEffect(() => {
        if (message?.type === 'success') {
            const timer = setTimeout(() => {
                setMessage(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [message])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Clear previous messages and errors
        setMessage(null)
        setNameError('')
        setEmailError('')
        setContentError('')

        // Validate name
        if (!name.trim()) {
            setNameError('Please enter your name')
            return
        }

        if (name.trim().length < 2) {
            setNameError('Name must be at least 2 characters')
            return
        }

        // Validate email if provided
        if (email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                setEmailError('Please enter a valid email address')
                return
            }
        }

        // Validate content
        if (!content.trim()) {
            setContentError('Please enter your comment')
            return
        }

        if (content.trim().length < 3) {
            setContentError('Comment must be at least 3 characters')
            return
        }

        if (content.trim().length > 1000) {
            setContentError('Comment must be less than 1000 characters')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    articleId,
                    authorName: name.trim(),
                    authorEmail: email.trim() || null,
                    content: content.trim(),
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: 'Thank you! Your comment has been submitted and will appear after moderation.'
                })

                // Clear form
                setName('')
                setEmail('')
                setContent('')

                // Notify parent component
                onCommentSubmitted?.()
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to submit comment. Please try again.' })
            }
        } catch (error) {
            console.error('Error submitting comment:', error)
            setMessage({ type: 'error', text: 'An error occurred. Please check your connection and try again.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const charCount = content.length
    const charLimit = 1000
    const charPercentage = (charCount / charLimit) * 100

    return (
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg p-8 border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Send className="w-6 h-6 text-blue-600" />
                Share Your Thoughts
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name and Email Row - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                            Your Name <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setNameError('')
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${nameError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                                }`}
                            placeholder="Enter your name"
                            maxLength={100}
                            disabled={isSubmitting}
                        />
                        {nameError && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {nameError}
                            </p>
                        )}
                    </div>

                    {/* Email Input */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                            Your Email <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setEmailError('')
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${emailError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                                }`}
                            placeholder="your@email.com"
                            maxLength={255}
                            disabled={isSubmitting}
                        />
                        {emailError && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {emailError}
                            </p>
                        )}
                    </div>
                </div>

                {/* Comment Textarea */}
                <div>
                    <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                        Your Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value)
                            setContentError('')
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none ${contentError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                            }`}
                        placeholder="Share your thoughts on this article..."
                        rows={5}
                        maxLength={charLimit}
                        disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center mt-2">
                        {contentError ? (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {contentError}
                            </p>
                        ) : (
                            <span className="text-xs text-gray-500">
                                All comments are reviewed before being published
                            </span>
                        )}
                        <span
                            className={`text-sm font-medium ${charPercentage > 90
                                    ? 'text-red-500'
                                    : charPercentage > 75
                                        ? 'text-orange-500'
                                        : 'text-gray-500'
                                }`}
                        >
                            {charCount} / {charLimit}
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Post Comment
                        </>
                    )}
                </button>
            </form>

            {/* Success/Error Message */}
            {message && (
                <div
                    className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-red-50 border-2 border-red-200'
                        }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p
                        className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                            }`}
                    >
                        {message.text}
                    </p>
                </div>
            )}
        </div>
    )
}
