'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'
import { MessageSquare, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from './auth-provider'

interface CommentsSectionProps {
    articleId: string
}

export function CommentsSection({ articleId }: CommentsSectionProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const { user, loading } = useAuth()

    const handleCommentSubmitted = () => {
        setRefreshTrigger(prev => prev + 1)
    }

    return (
        <div className="mt-16 pt-12 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-7 h-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">Comments</h2>
            </div>

            <div className="space-y-8">
                {/* Comment Form - only when signed in */}
                {loading ? (
                    <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg p-8 border border-blue-100 animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
                        <div className="h-24 bg-gray-100 rounded" />
                    </div>
                ) : user ? (
                    <CommentForm
                        articleId={articleId}
                        onCommentSubmitted={handleCommentSubmitted}
                    />
                ) : (
                    <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg p-8 border border-blue-100 text-center">
                        <p className="text-gray-700 mb-6">Sign in to join the conversation and share your thoughts.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                            >
                                <UserPlus className="w-5 h-5" />
                                Create Account
                            </Link>
                        </div>
                    </div>
                )}

                {/* Comment List */}
                <CommentList
                    articleId={articleId}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        </div>
    )
}
