'use client'

import { useState } from 'react'
import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'
import { MessageSquare } from 'lucide-react'

interface CommentsSectionProps {
    articleId: string
}

export function CommentsSection({ articleId }: CommentsSectionProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleCommentSubmitted = () => {
        // Increment trigger to refresh comment list
        setRefreshTrigger(prev => prev + 1)
    }

    return (
        <div className="mt-16 pt-12 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-7 h-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">Comments</h2>
            </div>

            <div className="space-y-8">
                {/* Comment Form */}
                <CommentForm
                    articleId={articleId}
                    onCommentSubmitted={handleCommentSubmitted}
                />

                {/* Comment List */}
                <CommentList
                    articleId={articleId}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        </div>
    )
}
