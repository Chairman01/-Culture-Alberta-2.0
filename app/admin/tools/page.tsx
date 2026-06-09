'use client'

import { useState, useEffect } from 'react'
import { Loader2, ThumbsUp, ThumbsDown, Heart, Users, MousePointerClick } from 'lucide-react'

interface ToolNote {
    note: string
    helpful: boolean
    created_at: string
}

interface ToolAgg {
    tool_slug: string
    uses: number
    users: number
    likes: number
    helpful_yes: number
    helpful_no: number
    notes: ToolNote[]
}

export default function ToolsAnalytics() {
    const [tools, setTools] = useState<ToolAgg[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTools = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/admin/tools')
            const data = await response.json()

            if (response.ok) {
                setTools(data.tools || [])
            } else {
                setError(data.error || 'Failed to load tool analytics')
            }
        } catch (err) {
            console.error('Error fetching tool analytics:', err)
            setError('Failed to load tool analytics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTools()
    }, [])

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

    const prettyName = (slug: string) =>
        slug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

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
                <h1 className="text-2xl font-bold text-gray-900">Tool Analytics</h1>
                <button
                    onClick={fetchTools}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Refresh
                </button>
            </div>

            {tools.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No tool engagement recorded yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {tools.map((tool) => (
                        <div
                            key={tool.tool_slug}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">{prettyName(tool.tool_slug)}</h3>
                                <code className="text-xs text-gray-500">{tool.tool_slug}</code>
                            </div>

                            {/* Stat tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <MousePointerClick className="w-3 h-3" /> Uses
                                    </div>
                                    <div className="text-xl font-bold text-gray-900">{tool.uses}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Users className="w-3 h-3" /> Users
                                    </div>
                                    <div className="text-xl font-bold text-gray-900">{tool.users}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Heart className="w-3 h-3" /> Likes
                                    </div>
                                    <div className="text-xl font-bold text-gray-900">{tool.likes}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                                        <ThumbsUp className="w-3 h-3" /> Helpful
                                    </div>
                                    <div className="text-xl font-bold text-green-700">{tool.helpful_yes}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3">
                                    <div className="flex items-center gap-1 text-xs text-red-700 mb-1">
                                        <ThumbsDown className="w-3 h-3" /> Not helpful
                                    </div>
                                    <div className="text-xl font-bold text-red-700">{tool.helpful_no}</div>
                                </div>
                            </div>

                            {/* Recent notes */}
                            {tool.notes.length > 0 && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Recent feedback notes</p>
                                    <div className="space-y-2">
                                        {tool.notes.map((n, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                {n.helpful ? (
                                                    <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                                ) : (
                                                    <ThumbsDown className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-gray-700 whitespace-pre-wrap">{n.note}</p>
                                                    <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
