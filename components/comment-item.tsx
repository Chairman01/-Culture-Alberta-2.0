'use client'

interface CommentItemProps {
    id: string
    authorName: string
    content: string
    createdAt: string
}

export function CommentItem({ authorName, content, createdAt }: CommentItemProps) {
    // Get initials for avatar
    const getInitials = (name: string) => {
        const words = name.trim().split(' ')
        if (words.length >= 2) {
            return `${words[0][0]}${words[1][0]}`.toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp)
            const now = new Date()
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

            // Less than a minute
            if (diffInSeconds < 60) {
                return 'just now'
            }

            // Less than an hour
            if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60)
                return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
            }

            // Less than a day
            if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600)
                return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
            }

            // Less than a week
            if (diffInSeconds < 604800) {
                const days = Math.floor(diffInSeconds / 86400)
                return `${days} ${days === 1 ? 'day' : 'days'} ago`
            }

            // Format as date
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            })
        } catch {
            return 'recently'
        }
    }

    // Generate a consistent color from the name
    const getAvatarColor = (name: string) => {
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

    return (
        <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:border-blue-200 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(
                        authorName
                    )} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                >
                    {getInitials(authorName)}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">{authorName}</h4>
                        <span className="text-xs text-gray-400">•</span>
                        <time className="text-sm text-gray-500">{formatTimestamp(createdAt)}</time>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                        {content}
                    </p>
                </div>
            </div>
        </div>
    )
}
