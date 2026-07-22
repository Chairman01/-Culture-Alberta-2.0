'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, MapPin, MessageCircle } from 'lucide-react'
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
    poll: { id: string; question: string; category: string; scope: 'article' | 'daily' } | null
    options?: PollOption[]
    totalVotes?: number
    myOptionId?: string | null
    cityTeasers?: CityTeaser[]
    myCity?: MyCityBlock | null
}

/**
 * Reader poll at the end of articles. An article's own poll wins; otherwise
 * the site-wide daily question. The article page suppresses this entirely on
 * sombre stories. After a vote, the card funnels readers into the comments.
 */
export function PollCard({ articleId }: { articleId?: string }) {
    const [data, setData] = useState<PollData | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [signedIn, setSignedIn] = useState(false)
    const [visible, setVisible] = useState(false)

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
            const params = new URLSearchParams({ clientId: getClientId() })
            if (articleId) params.set('articleId', articleId)
            const res = await fetch(`/api/polls/active?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            if (!res.ok) return
            const json: PollData = await res.json()
            setData(json)
            if (json.myOptionId) setShowResults(true)
        } catch {
            // The poll is a bonus — never surface an error on the article page
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

    const scrollToComments = () => {
        const target = document.getElementById('comments')
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (data && !data.poll) return null

    const isArticlePoll = data?.poll?.scope === 'article'
    const leader = showResults && data?.options?.length
        ? data.options.reduce((a, b) => (b.votes > a.votes ? b : a))
        : null

    return (
        <div data-poll-card={data ? 'loaded' : visible ? 'fetching' : 'waiting'}>
            {data?.poll && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-2">
                        {isArticlePoll ? 'What do you think?' : "Today's Alberta question"}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900 leading-snug mb-5">{data.poll.question}</h3>

                    {!showResults ? (
                        <div className="space-y-2.5">
                            {(data.options || []).map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => vote(option.id)}
                                    className="w-full text-left px-5 py-3.5 rounded-xl border border-gray-200 text-gray-800 font-medium text-sm sm:text-base hover:border-orange-500 hover:bg-orange-50/60 active:scale-[0.99] transition-all disabled:opacity-60"
                                >
                                    {option.label}
                                </button>
                            ))}
                            <p className="text-xs text-gray-400 pt-1">One tap to vote. No signup needed.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(data.options || []).map(option => {
                                const mine = option.id === data.myOptionId
                                const leading = leader && option.id === leader.id && option.votes > 0
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => vote(option.id)}
                                        disabled={submitting}
                                        className="w-full text-left group"
                                        title="Change your vote"
                                    >
                                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                                            <span className={`text-sm sm:text-base ${mine || leading ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                {option.label}
                                                {mine && <Check className="inline w-4 h-4 ml-1.5 text-orange-500 align-[-2px]" />}
                                            </span>
                                            <span className={`tabular-nums text-sm ${leading ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {option.pct}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${mine ? 'bg-orange-500' : leading ? 'bg-orange-300' : 'bg-gray-300'}`}
                                                style={{ width: `${Math.max(option.pct, option.votes > 0 ? 3 : 0)}%` }}
                                            />
                                        </div>
                                    </button>
                                )
                            })}

                            {(data.cityTeasers?.length || 0) > 0 && (
                                <div className="flex items-start gap-1.5 text-sm text-gray-600 pt-1">
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
                                                <Link href="/auth/signin" className="text-orange-600 font-medium hover:underline">
                                                    sign in to see your city&apos;s full split
                                                </Link>
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}

                            {data.myCity && (
                                <div className="rounded-lg bg-gray-50 px-4 py-3">
                                    <p className="text-sm font-semibold text-gray-800 mb-1.5">How {data.myCity.label} voted ({data.myCity.total})</p>
                                    <div className="space-y-1">
                                        {data.myCity.rows.map(row => {
                                            const label = data.options?.find(o => o.id === row.optionId)?.label
                                            if (!label) return null
                                            return (
                                                <div key={row.optionId} className="flex justify-between text-sm text-gray-600">
                                                    <span>{label}</span>
                                                    <span className="tabular-nums font-medium">{row.pct}%</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                <span className="text-sm text-gray-500 tabular-nums">
                                    {(data.totalVotes || 0).toLocaleString('en-CA')} vote{(data.totalVotes || 0) === 1 ? '' : 's'}
                                    {!isArticlePoll && <span className="text-gray-400"> · fresh question tomorrow</span>}
                                </span>
                                <button
                                    type="button"
                                    onClick={scrollToComments}
                                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Tell us why in the comments
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
