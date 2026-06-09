'use client'

import { useCallback, useEffect, useState } from 'react'
import { CommentItem, type CommentNode } from './comment-item'
import { Loader2, MessageSquare } from 'lucide-react'
import { getClientId } from '@/lib/anon-client-id'
import { useCurrentUser } from '@/lib/use-current-user'

interface CommentListProps {
    articleId: string
    refreshTrigger?: number
}

const PAGE_SIZE = 10

export function CommentList({ articleId, refreshTrigger }: CommentListProps) {
    const [comments, setComments] = useState<CommentNode[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
    const [signInHref, setSignInHref] = useState('/auth/signin')

    const { user, accessToken } = useCurrentUser()
    const isLoggedIn = !!user

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSignInHref(`/auth/signin?next=${encodeURIComponent(window.location.pathname)}`)
        }
    }, [])

    const fetchPage = useCallback(
        async (offset: number, append: boolean) => {
            try {
                if (append) setLoadingMore(true)
                else setIsLoading(true)
                setError(null)

                const clientId = getClientId()
                const response = await fetch(
                    `/api/comments?articleId=${encodeURIComponent(articleId)}&clientId=${encodeURIComponent(
                        clientId
                    )}&limit=${PAGE_SIZE}&offset=${offset}`
                )
                const data = await response.json()

                if (response.ok) {
                    const incoming: CommentNode[] = data.comments || []
                    setComments((prev) => (append ? [...prev, ...incoming] : incoming))
                    setTotal(data.total || 0)
                } else {
                    setError(data.error || 'Failed to load comments')
                }
            } catch (err) {
                console.error('Error fetching comments:', err)
                setError('Failed to load comments')
            } finally {
                setIsLoading(false)
                setLoadingMore(false)
            }
        },
        [articleId]
    )

    useEffect(() => {
        fetchPage(0, false)
    }, [fetchPage, refreshTrigger])

    // Optimistic like toggle for a comment or reply
    const handleToggleLike = useCallback(async (commentId: string) => {
        const clientId = getClientId()

        const apply = (list: CommentNode[]): CommentNode[] =>
            list.map((c) => {
                if (c.id === commentId) {
                    const liked = !c.liked_by_client
                    return {
                        ...c,
                        liked_by_client: liked,
                        like_count: Math.max(0, c.like_count + (liked ? 1 : -1)),
                    }
                }
                if (c.replies && c.replies.length) {
                    return { ...c, replies: apply(c.replies) }
                }
                return c
            })

        setComments((prev) => apply(prev))

        try {
            const res = await fetch(`/api/comments/${commentId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId }),
            })
            const data = await res.json()
            if (res.ok) {
                const reconcile = (list: CommentNode[]): CommentNode[] =>
                    list.map((c) => {
                        if (c.id === commentId) {
                            return { ...c, liked_by_client: data.liked, like_count: data.likeCount }
                        }
                        if (c.replies && c.replies.length) {
                            return { ...c, replies: reconcile(c.replies) }
                        }
                        return c
                    })
                setComments((prev) => reconcile(prev))
            }
        } catch (err) {
            console.error('Error toggling comment like:', err)
        }
    }, [])

    // Post a reply (requires logged-in user)
    const handleReply = useCallback(
        async (parentId: string, content: string): Promise<boolean> => {
            if (!accessToken) return false
            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ articleId, content, parentId }),
                })
                const data = await res.json()
                if (!res.ok || !data.comment) return false

                const newReply: CommentNode = data.comment
                setComments((prev) =>
                    prev.map((c) =>
                        c.id === parentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
                    )
                )
                return true
            } catch (err) {
                console.error('Error posting reply:', err)
                return false
            }
        },
        [accessToken, articleId]
    )

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                <div className="flex items-center justify-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading comments...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchPage(0, false)}
                        className="text-blue-600 hover:text-blue-700 font-medium underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        )
    }

    if (comments.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-sm p-12 border border-gray-200">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h3>
                    <p className="text-gray-600">Be the first to share your thoughts on this article!</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">
                    {total} {total === 1 ? 'Comment' : 'Comments'}
                </h3>
            </div>

            <div className="space-y-4">
                {comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        isLoggedIn={isLoggedIn}
                        signInHref={signInHref}
                        onToggleLike={handleToggleLike}
                        onReply={handleReply}
                    />
                ))}
            </div>

            {comments.length < total && (
                <div className="text-center pt-2">
                    <button
                        onClick={() => fetchPage(comments.length, true)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50"
                    >
                        {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                        Load more comments
                    </button>
                </div>
            )}
        </div>
    )
}
