'use client'

import { useEffect, useState } from 'react'
import { CommentItem } from './comment-item'
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react'

interface Comment {
    id: string
    author_name: string
    content: string
    created_at: string
}

interface CommentListProps {
    articleId: string
    refreshTrigger?: number
}

const COMMENTS_PER_PAGE = 10

export function CommentList({ articleId, refreshTrigger }: CommentListProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)

    const fetchComments = async (append = false) => {
        try {
            if (append) {
                setIsLoadingMore(true)
            } else {
                setIsLoading(true)
                setComments([])
            }
            setError(null)

            const offset = append ? comments.length : 0
            const response = await fetch(
                `/api/comments?articleId=${articleId}&limit=${COMMENTS_PER_PAGE}&offset=${offset}`
            )
            const data = await response.json()

            if (response.ok) {
                const newComments = data.comments || []
                setComments(prev => append ? [...prev, ...newComments] : newComments)
                setTotal(data.total || 0)
                setHasMore((offset + newComments.length) < (data.total || 0))
            } else {
                setError(data.error || 'Failed to load comments')
            }
        } catch (err) {
            console.error('Error fetching comments:', err)
            setError('Failed to load comments')
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleLoadMore = () => {
        fetchComments(true)
    }

    useEffect(() => {
        fetchComments()
    }, [articleId, refreshTrigger])

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
                        onClick={() => fetchComments()}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No comments yet
                    </h3>
                    <p className="text-gray-600">
                        Be the first to share your thoughts on this article!
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Comment Count Header */}
            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">
                    {total} {total === 1 ? 'Comment' : 'Comments'}
                </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        id={comment.id}
                        authorName={comment.author_name}
                        content={comment.content}
                        createdAt={comment.created_at}
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex flex-col items-center gap-3 pt-4">
                    <p className="text-sm text-gray-500">
                        Showing {comments.length} of {total} comments
                    </p>
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="group flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 text-blue-600 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                                Load More Comments
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
