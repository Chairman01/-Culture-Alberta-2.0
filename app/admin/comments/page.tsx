'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, Trash2, Eye, EyeOff } from 'lucide-react'

interface Comment {
    id: string
    article_id: string
    author_name: string
    author_email: string | null
    content: string
    status: 'pending' | 'approved' | 'rejected'
    ip_address: string | null
    created_at: string
    articles?: {
        title: string
    }
}

export default function CommentsModeration() {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
    const [processingId, setProcessingId] = useState<string | null>(null)

    const fetchComments = async () => {
        try {
            setLoading(true)
            setError(null)

            const statusParam = filter === 'all' ? '' : `?status=${filter}`
            const response = await fetch(`/api/admin/comments${statusParam}`)
            const data = await response.json()

            if (response.ok) {
                setComments(data.comments || [])
            } else {
                setError(data.error || 'Failed to load comments')
            }
        } catch (err) {
            console.error('Error fetching comments:', err)
            setError('Failed to load comments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchComments()
    }, [filter])

    const handleUpdateStatus = async (commentId: string, status: 'approved' | 'rejected') => {
        setProcessingId(commentId)
        try {
            const response = await fetch('/api/admin/comments', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commentId, status }),
            })

            const data = await response.json()

            if (response.ok) {
                // Refresh comments
                await fetchComments()
            } else {
                alert(data.error || 'Failed to update comment')
            }
        } catch (err) {
            console.error('Error updating comment:', err)
            alert('Failed to update comment')
        } finally {
            setProcessingId(null)
        }
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
            return
        }

        setProcessingId(commentId)
        try {
            const response = await fetch(`/api/admin/comments?commentId=${commentId}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (response.ok) {
                // Refresh comments
                await fetchComments()
            } else {
                alert(data.error || 'Failed to delete comment')
            }
        } catch (err) {
            console.error('Error deleting comment:', err)
            alert('Failed to delete comment')
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                    </span>
                )
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Rejected
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Loader2 className="w-3 h-3" />
                        Pending
                    </span>
                )
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Comment Moderation</h1>
                <button
                    onClick={fetchComments}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 font-medium transition-colors ${filter === tab
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No {filter !== 'all' ? filter : ''} comments found.
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-gray-900">{comment.author_name}</h3>
                                        {getStatusBadge(comment.status)}
                                    </div>
                                    {comment.author_email && (
                                        <p className="text-sm text-gray-600">{comment.author_email}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(comment.created_at)}
                                        {comment.ip_address && ` • IP: ${comment.ip_address}`}
                                    </p>
                                </div>
                            </div>

                            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{comment.content}</p>

                            {comment.articles?.title && (
                                <p className="text-sm text-gray-600 mb-4">
                                    Article: <span className="font-medium">{comment.articles.title}</span>
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {comment.status !== 'approved' && (
                                    <button
                                        onClick={() => handleUpdateStatus(comment.id, 'approved')}
                                        disabled={processingId === comment.id}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === comment.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                        Approve
                                    </button>
                                )}

                                {comment.status !== 'rejected' && (
                                    <button
                                        onClick={() => handleUpdateStatus(comment.id, 'rejected')}
                                        disabled={processingId === comment.id}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === comment.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <EyeOff className="w-4 h-4" />
                                        )}
                                        Reject
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={processingId === comment.id}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                                >
                                    {processingId === comment.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
