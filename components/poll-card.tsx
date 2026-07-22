'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Check, MapPin } from 'lucide-react'
import { getClientId } from '@/lib/anon-client-id'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface PollOption {
    id: string
    label: string
    votes: number
    pct: number
}

interface CityTeaser {
    city: string
    label: string
    topOptionLabel: string
    pct: number
}

interface MyCityBlock {
    city: string
    label: string
    total: number
    rows: { optionId: string; votes: number; pct: number }[]
}

interface PollData {
    poll: { id: string; question: string; category: string } | null
    options?: PollOption[]
    totalVotes?: number
    myOptionId?: string | null
    cityTeasers?: CityTeaser[]
    myCity?: MyCityBlock | null
}

/**
 * "Today's Alberta question" — the site-wide daily poll, shown at the end of
 * articles (suppressed on sombre stories by the article page). Fetches lazily
 * when scrolled into view so bounced visits cost nothing.
 */
export function PollCard() {
    const [data, setData] = useState<PollData | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [signedIn, setSignedIn] = useState(false)
    const [visible, setVisible] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    // Deferred load rather than IntersectionObserver: the Mediavine ad script
    // patches IO on article pages and its callbacks never fire. A short delay
    // still keeps instant bounces from paying for the fetch.
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
    }, [])

    const load = async () => {
        try {
            const { data: sessionData } = await supabaseBrowser.auth.getSession()
            const token = sessionData.session?.access_token
            setSignedIn(!!token)
            const res = await fetch(`/api/polls/active?clientId=${encodeURIComponent(getClientId())}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            if (!res.ok) return
            const json: PollData = await res.json()
            setData(json)
            if (json.myOptionId) setShowResults(true)
        } catch {
            // Poll is a bonus — never let it surface an error on the article page
        }
    }

    useEffect(() => {
        if (visible) load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

    const vote = async (optionId: string) => {
        if (!data?.poll || submitting) return
        setSubmitting(true)
        try {
            const { data: sessionData } = await supabaseBrowser.auth.getSession()
            const token = sessionData.session?.access_token
            const res = await fetch('/api/polls/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ pollId: data.poll.id, optionId, clientId: getClientId() }),
            })
            if (res.ok) {
                setShowResults(true)
                await load()
            }
        } catch {
            // ignore — reader can tap again
        } finally {
            setSubmitting(false)
        }
    }

    // Reserve no space until we know there is a poll — the card simply doesn't
    // exist for readers when the bank is empty.
    if (data && !data.poll) return null

    return (
        <div ref={rootRef} data-poll-card={data ? 'loaded' : visible ? 'fetching' : 'waiting'}>
            {data?.poll && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                        <span>Today&apos;s Alberta question</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-4">{data.poll.question}</p>

                    {!showResults ? (
                        <div className="space-y-2">
                            {(data.options || []).map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => vote(option.id)}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-800 text-sm sm:text-base hover:border-orange-400 hover:bg-orange-50 transition-colors disabled:opacity-60"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(data.options || []).map(option => {
                                const mine = option.id === data.myOptionId
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => vote(option.id)}
                                        disabled={submitting}
                                        className="w-full text-left group"
                                        title="Change your vote"
                                    >
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className={`flex items-center gap-1.5 ${mine ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {option.label}
                                                {mine && <Check className="w-4 h-4 text-orange-500" />}
                                            </span>
                                            <span className="text-gray-500 font-medium tabular-nums">{option.pct}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${mine ? 'bg-orange-400' : 'bg-gray-300'}`}
                                                style={{ width: `${Math.max(option.pct, option.votes > 0 ? 3 : 0)}%` }}
                                            />
                                        </div>
                                    </button>
                                )
                            })}

                            {(data.cityTeasers?.length || 0) > 0 && (
                                <div className="border-t border-gray-100 pt-3 text-sm text-gray-600 flex items-start gap-1.5">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                    <span>
                                        {data.cityTeasers!.map((teaser, index) => (
                                            <span key={teaser.city}>
                                                {index > 0 && ' · '}
                                                {teaser.label} picks {teaser.topOptionLabel} ({teaser.pct}%)
                                            </span>
                                        ))}
                                        {!signedIn && (
                                            <>
                                                {' — '}
                                                <Link href="/auth/signin" className="text-orange-600 hover:underline">
                                                    sign in to see your city&apos;s full split
                                                </Link>
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}

                            {data.myCity && (
                                <div className="border-t border-gray-100 pt-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">How {data.myCity.label} voted ({data.myCity.total} votes)</p>
                                    <div className="space-y-1">
                                        {data.myCity.rows.map(row => {
                                            const label = data.options?.find(o => o.id === row.optionId)?.label
                                            if (!label) return null
                                            return (
                                                <div key={row.optionId} className="flex justify-between text-sm text-gray-600">
                                                    <span>{label}</span>
                                                    <span className="tabular-nums">{row.pct}%</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-gray-400 mt-4">
                        {showResults
                            ? `${data.totalVotes || 0} vote${(data.totalVotes || 0) === 1 ? '' : 's'} · new question every morning`
                            : 'One tap to vote · new question every morning'}
                    </p>
                </div>
            )}
        </div>
    )
}
