'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { getClientId } from '@/lib/anon-client-id'

interface ArticleLikeButtonProps {
    articleId: string
}

function formatCount(n: number): string {
    if (n < 1000) return String(n)
    if (n < 1000000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0).replace(/\.0$/, '') + 'K'
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
}

export function ArticleLikeButton({ articleId }: ArticleLikeButtonProps) {
    const [count, setCount] = useState(0)
    const [vote, setVote] = useState(0) // 1 = up, -1 = down, 0 = none
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let active = true
        const clientId = getClientId()
        fetch(`/api/articles/${encodeURIComponent(articleId)}/like?clientId=${encodeURIComponent(clientId)}`)
            .then((r) => r.json())
            .then((d) => {
                if (!active) return
                setCount(d.count || 0)
                setVote(d.vote || 0)
            })
            .catch(() => {})
            .finally(() => active && setReady(true))
        return () => {
            active = false
        }
    }, [articleId])

    const submitVote = async (direction: 1 | -1) => {
        const clientId = getClientId()
        const prevVote = vote
        const prevCount = count

        // optimistic update of the thumbs-up count
        const clearing = prevVote === direction
        const nextVote = clearing ? 0 : direction
        let nextCount = prevCount
        if (prevVote === 1) nextCount -= 1 // removing an existing up-vote
        if (nextVote === 1) nextCount += 1 // adding an up-vote
        setVote(nextVote)
        setCount(Math.max(0, nextCount))

        try {
            const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, vote: direction }),
            })
            const data = await res.json()
            if (res.ok) {
                setVote(data.vote)
                setCount(data.count)
            } else {
                setVote(prevVote)
                setCount(prevCount)
            }
        } catch {
            setVote(prevVote)
            setCount(prevCount)
        }
    }

    return (
        <div className={`inline-flex items-center rounded-full bg-gray-100 shrink-0 ${ready ? '' : 'opacity-70'}`}>
            <button
                type="button"
                onClick={() => submitVote(1)}
                aria-pressed={vote === 1}
                aria-label="Thumbs up"
                className={`inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-l-full transition-colors hover:bg-gray-200 ${
                    vote === 1 ? 'text-blue-600' : 'text-gray-700'
                }`}
            >
                <ThumbsUp className={`w-5 h-5 ${vote === 1 ? 'fill-current' : ''}`} />
                <span className="text-sm font-semibold tabular-nums">{formatCount(count)}</span>
            </button>
            <span className="w-px h-6 bg-gray-300" aria-hidden="true" />
            <button
                type="button"
                onClick={() => submitVote(-1)}
                aria-pressed={vote === -1}
                aria-label="Thumbs down"
                className={`inline-flex items-center px-4 py-2.5 rounded-r-full transition-colors hover:bg-gray-200 ${
                    vote === -1 ? 'text-blue-600' : 'text-gray-700'
                }`}
            >
                <ThumbsDown className={`w-5 h-5 ${vote === -1 ? 'fill-current' : ''}`} />
            </button>
        </div>
    )
}
