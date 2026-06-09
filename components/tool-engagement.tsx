'use client'

import { useEffect, useRef, useState } from 'react'
import { Heart, ThumbsUp, ThumbsDown, Loader2, CheckCircle } from 'lucide-react'
import { getClientId } from '@/lib/anon-client-id'

interface ToolEngagementProps {
    toolSlug: string
}

export function ToolEngagement({ toolSlug }: ToolEngagementProps) {
    const rootRef = useRef<HTMLDivElement | null>(null)

    // ---- Like state ----
    const [count, setCount] = useState(0)
    const [liked, setLiked] = useState(false)

    // ---- Feedback state ----
    const [helpful, setHelpful] = useState<boolean | null>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Load like count + liked status
    useEffect(() => {
        let active = true
        const clientId = getClientId()
        fetch(`/api/tools/${encodeURIComponent(toolSlug)}/like?clientId=${encodeURIComponent(clientId)}`)
            .then((r) => r.json())
            .then((d) => {
                if (!active) return
                setCount(d.count || 0)
                setLiked(!!d.liked)
            })
            .catch(() => {})
        return () => {
            active = false
        }
    }, [toolSlug])

    // Usage probe: record one usage on first real interaction within the tool,
    // gated to once per browser session.
    useEffect(() => {
        const sessionKey = `ca_tool_used_${toolSlug}`
        let recorded = false
        try {
            recorded = sessionStorage.getItem(sessionKey) === '1'
        } catch {
            // ignore
        }
        if (recorded) return

        // Find the closest tool root container, else fall back to document
        const root: ParentNode =
            rootRef.current?.closest('[data-tool-root]') ?? document

        const record = () => {
            if (recorded) return
            recorded = true
            try {
                sessionStorage.setItem(sessionKey, '1')
            } catch {
                // ignore
            }
            const clientId = getClientId()
            fetch(`/api/tools/${encodeURIComponent(toolSlug)}/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId }),
            }).catch(() => {})
            cleanup()
        }

        const cleanup = () => {
            root.removeEventListener('pointerdown', record as EventListener)
            root.removeEventListener('change', record as EventListener)
            root.removeEventListener('input', record as EventListener)
        }

        root.addEventListener('pointerdown', record as EventListener)
        root.addEventListener('change', record as EventListener)
        root.addEventListener('input', record as EventListener)

        return cleanup
    }, [toolSlug])

    const toggleLike = async () => {
        const clientId = getClientId()
        const nextLiked = !liked
        setLiked(nextLiked)
        setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)))
        try {
            const res = await fetch(`/api/tools/${encodeURIComponent(toolSlug)}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId }),
            })
            const data = await res.json()
            if (res.ok) {
                setLiked(data.liked)
                setCount(data.count)
            }
        } catch {
            setLiked(liked)
            setCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)))
        }
    }

    const submitFeedback = async (value: boolean, withNote: boolean) => {
        setSubmitting(true)
        try {
            const clientId = getClientId()
            await fetch(`/api/tools/${encodeURIComponent(toolSlug)}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    helpful: value,
                    note: withNote ? note.trim() || null : null,
                    clientId,
                }),
            })
            setSubmitted(true)
        } catch {
            // ignore — keep UI responsive
            setSubmitted(true)
        } finally {
            setSubmitting(false)
        }
    }

    const handleHelpfulChoice = (value: boolean) => {
        setHelpful(value)
        // Record the yes/no immediately; the note (if any) is sent on explicit submit.
        submitFeedback(value, false)
    }

    return (
        <div ref={rootRef} className="mt-10 border-t border-gray-200 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                {/* Like */}
                <button
                    type="button"
                    onClick={toggleLike}
                    aria-pressed={liked}
                    aria-label="Like this tool"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-semibold transition-all w-fit ${
                        liked
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600'
                    }`}
                >
                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                    <span>{liked ? 'Liked' : 'Like this tool'}</span>
                    {count > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-gray-100 text-gray-700 text-sm">
                            {count}
                        </span>
                    )}
                </button>

                {/* Feedback */}
                <div className="sm:text-right">
                    {submitted ? (
                        <p className="inline-flex items-center gap-2 text-green-700 font-medium">
                            <CheckCircle className="w-5 h-5" />
                            Thanks for your feedback!
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 sm:justify-end">
                                <span className="text-sm font-medium text-gray-700">Was this helpful?</span>
                                <button
                                    type="button"
                                    onClick={() => handleHelpfulChoice(true)}
                                    disabled={submitting}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                        helpful === true
                                            ? 'bg-green-50 border-green-300 text-green-700'
                                            : 'border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700'
                                    }`}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleHelpfulChoice(false)}
                                    disabled={submitting}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                        helpful === false
                                            ? 'bg-red-50 border-red-300 text-red-700'
                                            : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700'
                                    }`}
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    No
                                </button>
                            </div>

                            {helpful !== null && (
                                <div className="flex flex-col sm:items-end gap-2">
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        rows={2}
                                        maxLength={1000}
                                        placeholder="Tell us more (optional)"
                                        className="w-full sm:w-80 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => submitFeedback(helpful, true)}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 w-fit"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Send feedback
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
