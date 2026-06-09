'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Loader2, Send } from 'lucide-react'

export interface CommentNode {
    id: string
    author_name: string
    content: string
    created_at: string
    parent_id: string | null
    is_member: boolean
    like_count: number
    liked_by_client: boolean
    replies?: CommentNode[]
}

interface CommentItemProps {
    comment: CommentNode
    isReply?: boolean
    isLoggedIn: boolean
    signInHref: string
    onToggleLike: (commentId: string) => void
    onReply?: (parentId: string, content: string) => Promise<boolean>
}

function getInitials(name: string) {
    const words = name.trim().split(' ')
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(name: string) {
    const colors = [
        'bg-gradient-to-br from-blue-500 to-blue-600',
        'bg-gradient-to-br from-green-500 to-green-600',
        'bg-gradient-to-br from-purple-500 to-purple-600',
        'bg-gradient-to-br from-pink-500 to-pink-600',
        'bg-gradient-to-br from-indigo-500 to-indigo-600',
        'bg-gradient-to-br from-red-500 to-red-600',
        'bg-gradient-to-br from-orange-500 to-orange-600',
        'bg-gradient-to-br from-teal-500 to-teal-600',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

function formatTimestamp(timestamp: string) {
    try {
        const date = new Date(timestamp)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
        if (diffInSeconds < 60) return 'just now'
        if (diffInSeconds < 3600) {
            const m = Math.floor(diffInSeconds / 60)
            return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`
        }
        if (diffInSeconds < 86400) {
            const h = Math.floor(diffInSeconds / 3600)
            return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
        }
        if (diffInSeconds < 604800) {
            const d = Math.floor(diffInSeconds / 86400)
            return `${d} ${d === 1 ? 'day' : 'days'} ago`
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        })
    } catch {
        return 'recently'
    }
}

export function CommentItem({
    comment,
    isReply = false,
    isLoggedIn,
    signInHref,
    onToggleLike,
    onReply,
}: CommentItemProps) {
    const [showReply, setShowReply] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [replyError, setReplyError] = useState('')

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setReplyError('')
        const text = replyText.trim()
        if (text.length < 3) {
            setReplyError('Reply must be at least 3 characters')
            return
        }
        if (!onReply) return
        setSubmitting(true)
        const ok = await onReply(comment.id, text)
        setSubmitting(false)
        if (ok) {
            setReplyText('')
            setShowReply(false)
        } else {
            setReplyError('Could not post reply. Please try again.')
        }
    }

    return (
        <div
            className={`bg-white rounded-xl border-2 border-gray-100 p-5 transition-all duration-200 ${
                isReply ? '' : 'hover:border-blue-200 hover:shadow-lg'
            }`}
        >
            <div className="flex items-start gap-4">
                <div
                    className={`flex-shrink-0 ${isReply ? 'w-9 h-9 text-xs' : 'w-12 h-12 text-sm'} rounded-full ${getAvatarColor(
                        comment.author_name
                    )} flex items-center justify-center text-white font-bold shadow-md`}
                >
                    {getInitials(comment.author_name)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-bold text-gray-900">{comment.author_name}</h4>
                        {comment.is_member && (
                            <span className="text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                Member
                            </span>
                        )}
                        <span className="text-xs text-gray-400">•</span>
                        <time className="text-sm text-gray-500">{formatTimestamp(comment.created_at)}</time>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3">
                        <button
                            type="button"
                            onClick={() => onToggleLike(comment.id)}
                            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                                comment.liked_by_client ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                            }`}
                            aria-pressed={comment.liked_by_client}
                            aria-label="Like comment"
                        >
                            <Heart
                                className={`w-4 h-4 ${comment.liked_by_client ? 'fill-current' : ''}`}
                            />
                            {comment.like_count > 0 && <span>{comment.like_count}</span>}
                        </button>

                        {!isReply && (
                            <button
                                type="button"
                                onClick={() => setShowReply((v) => !v)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Reply
                            </button>
                        )}
                    </div>

                    {/* Reply composer */}
                    {showReply && !isReply && (
                        <div className="mt-4">
                            {isLoggedIn ? (
                                <form onSubmit={handleReplySubmit} className="space-y-2">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => {
                                            setReplyText(e.target.value)
                                            setReplyError('')
                                        }}
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Write a reply..."
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
                                        disabled={submitting}
                                    />
                                    {replyError && <p className="text-sm text-red-600">{replyError}</p>}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Post reply
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowReply(false)}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                    <Link href={signInHref} className="text-blue-600 font-semibold hover:underline">
                                        Sign in
                                    </Link>{' '}
                                    to reply to this comment.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Replies */}
                    {!isReply && comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                            {comment.replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    isReply
                                    isLoggedIn={isLoggedIn}
                                    signInHref={signInHref}
                                    onToggleLike={onToggleLike}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
