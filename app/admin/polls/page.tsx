'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Check, Download, Loader2, Plus, RefreshCw, Trash2, Trophy } from 'lucide-react'

interface AdminPollOption {
    id: string
    label: string
    votes: number
}

interface AdminPoll {
    id: string
    question: string
    category: string
    status: 'draft' | 'approved' | 'active' | 'done'
    article_id: string | null
    articleTitle: string | null
    activated_at: string | null
    closed_at: string | null
    created_at: string
    totalVotes: number
    options: AdminPollOption[]
}

const CATEGORIES = ['general', 'food', 'city-life', 'outdoors', 'transit', 'weather', 'sports', 'nostalgia']

export default function AdminPollsPage() {
    const [polls, setPolls] = useState<AdminPoll[] | null>(null)
    const [error, setError] = useState('')
    const [refreshing, setRefreshing] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)

    const [question, setQuestion] = useState('')
    const [category, setCategory] = useState('general')
    const [optionsText, setOptionsText] = useState('')
    const [creating, setCreating] = useState(false)
    const [backfilling, setBackfilling] = useState(false)
    const [backfillNote, setBackfillNote] = useState('')
    const [storySort, setStorySort] = useState<'responses' | 'newest'>('responses')

    const backfill = async () => {
        setBackfilling(true)
        setBackfillNote('Writing polls — this takes a minute or two per batch…')
        try {
            const res = await fetch('/api/admin/polls/backfill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 20 }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Backfill failed')
            setBackfillNote(
                `Wrote ${json.created} poll${json.created === 1 ? '' : 's'} (${json.skippedAsSensitive} skipped as sensitive). ` +
                (json.remaining > 0 ? `${json.remaining} articles still need one — run it again.` : 'All caught up.')
            )
            await load()
        } catch (e) {
            setBackfillNote(e instanceof Error ? e.message : 'Backfill failed')
        } finally {
            setBackfilling(false)
        }
    }

    const load = async () => {
        setRefreshing(true)
        setError('')
        try {
            const res = await fetch('/api/admin/polls', { cache: 'no-store' })
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
            const json = await res.json()
            setPolls(json.polls || [])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load polls')
        } finally {
            setRefreshing(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const act = async (id: string, action: string) => {
        setBusyId(id)
        try {
            const res = await fetch(`/api/admin/polls/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            if (!res.ok) throw new Error((await res.json()).error || 'Action failed')
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Action failed')
        } finally {
            setBusyId(null)
        }
    }

    const remove = async (id: string, questionText: string) => {
        if (!window.confirm(`Delete this question?\n\n"${questionText}"`)) return
        setBusyId(id)
        try {
            const res = await fetch(`/api/admin/polls/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed')
        } finally {
            setBusyId(null)
        }
    }

    const create = async () => {
        const optionLabels = optionsText.split('\n').map(s => s.trim()).filter(Boolean)
        setCreating(true)
        setError('')
        try {
            const res = await fetch('/api/admin/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question.trim(), category, options: optionLabels, status: 'approved' }),
            })
            if (!res.ok) throw new Error((await res.json()).error || 'Create failed')
            setQuestion('')
            setOptionsText('')
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Create failed')
        } finally {
            setCreating(false)
        }
    }

    // Story polls, ranked. "Newest" is the API order (newest first after we reverse
    // created_at ascending); "responses" surfaces the best-performing questions.
    const storyPolls = useMemo(() => {
        const rows = (polls || []).filter(p => p.article_id)
        const byNewest = [...rows].reverse()
        if (storySort === 'newest') return byNewest
        return [...byNewest].sort((a, b) => b.totalVotes - a.totalVotes)
    }, [polls, storySort])

    const storyStats = useMemo(() => {
        const totalVotes = storyPolls.reduce((sum, p) => sum + p.totalVotes, 0)
        const answered = storyPolls.filter(p => p.totalVotes > 0).length
        const top = storyPolls.reduce<AdminPoll | null>((best, p) => (!best || p.totalVotes > best.totalVotes ? p : best), null)
        return { totalVotes, answered, top: top && top.totalVotes > 0 ? top : null }
    }, [storyPolls])

    const exportCsv = () => {
        const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
        const header = ['Rank', 'Question', 'Article', 'Total votes', 'Status', 'Winning option', 'Option', 'Votes', 'Percent']
        const lines = [header.map(esc).join(',')]
        // Rank by responses regardless of the on-screen sort, so the file is stable.
        const ranked = [...storyPolls].sort((a, b) => b.totalVotes - a.totalVotes)
        ranked.forEach((poll, i) => {
            const winner = poll.totalVotes > 0
                ? [...poll.options].sort((a, b) => b.votes - a.votes)[0]?.label ?? ''
                : ''
            poll.options.forEach(option => {
                const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0
                lines.push([
                    i + 1, poll.question, poll.articleTitle || '', poll.totalVotes, poll.status,
                    winner, option.label, option.votes, `${pct}%`,
                ].map(esc).join(','))
            })
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `story-polls-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const sections: { title: string; hint: string; status: AdminPoll['status']; }[] = [
        { title: 'Live now', hint: 'Showing at the end of every article. The cron rotates it each morning.', status: 'active' },
        { title: 'Queued', hint: 'Approved and waiting — the rotation picks from the top of this list.', status: 'approved' },
        { title: 'Drafts', hint: 'Not in rotation until you approve them.', status: 'draft' },
        { title: 'Finished', hint: 'Past questions with their final results.', status: 'done' },
    ]

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-orange-500" />
                    <h1 className="text-2xl font-bold text-gray-900">Daily poll</h1>
                </div>
                <button
                    onClick={load}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                One question a day, shown at the end of every article (hidden on crime and tragedy stories).
                Rotation is automatic — keep the queue topped up and it runs itself.
            </p>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

            {polls === null && !error ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : polls && (
                <div className="space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Story polls
                            <span className="ml-2 text-sm font-normal text-gray-400">{storyPolls.length}</span>
                        </h2>
                        <p className="text-xs text-gray-500 mb-3">
                            AI-written for each published article (sombre stories are skipped). These run on their own article only.
                        </p>

                        {storyPolls.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                    <p className="text-xs text-gray-400">Total responses</p>
                                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{storyStats.totalVotes.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{storyStats.answered} of {storyPolls.length} polls got votes</p>
                                </div>
                                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 sm:col-span-2 min-w-0">
                                    <p className="text-xs text-orange-600 flex items-center gap-1">
                                        <Trophy className="w-3.5 h-3.5" /> Most responses
                                    </p>
                                    {storyStats.top ? (
                                        <>
                                            <p className="font-semibold text-gray-900 truncate mt-0.5">{storyStats.top.question}</p>
                                            <p className="text-xs text-orange-700 mt-0.5 tabular-nums">
                                                {storyStats.top.totalVotes} vote{storyStats.top.totalVotes === 1 ? '' : 's'}
                                                {storyStats.top.articleTitle ? ` · ${storyStats.top.articleTitle}` : ''}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500 mt-0.5">No votes yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-medium">
                                {(['responses', 'newest'] as const).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setStorySort(key)}
                                        className={`px-3 py-1 rounded-md transition-colors ${storySort === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        {key === 'responses' ? 'Most responses' : 'Newest'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={exportCsv}
                                    disabled={storyPolls.length === 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                <button
                                    onClick={backfill}
                                    disabled={backfilling}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                                >
                                    {backfilling ? 'Writing…' : 'Write missing story polls'}
                                </button>
                            </div>
                        </div>
                        {backfillNote && <p className="text-xs text-gray-600 mb-3">{backfillNote}</p>}
                        {storyPolls.length === 0 ? (
                            <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                                None yet — one is generated automatically the next time you publish an article.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {storyPolls.map((poll, index) => {
                                    const topVotes = Math.max(0, ...poll.options.map(o => o.votes))
                                    return (
                                    <div key={poll.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="flex items-start gap-3 min-w-0">
                                                {storySort === 'responses' && (
                                                    <span className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums ${index === 0 && poll.totalVotes > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {index + 1}
                                                    </span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900">{poll.question}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {poll.articleTitle ? `On: ${poll.articleTitle}` : 'On its article'} · <span className="font-medium text-gray-500 tabular-nums">{poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}</span>
                                                        {poll.status === 'done' && ' · closed'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {poll.status === 'active' && (
                                                    <button onClick={() => act(poll.id, 'close')} disabled={busyId === poll.id}
                                                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                                                        Close
                                                    </button>
                                                )}
                                                <button onClick={() => remove(poll.id, poll.question)} disabled={busyId === poll.id}
                                                    aria-label="Delete question"
                                                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {poll.totalVotes > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                {poll.options.map(option => {
                                                    const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0
                                                    const leading = option.votes === topVotes && topVotes > 0
                                                    return (
                                                        <div key={option.id}>
                                                            <div className="flex justify-between text-xs mb-0.5">
                                                                <span className={leading ? 'font-semibold text-gray-900' : 'text-gray-600'}>{option.label}</span>
                                                                <span className={`tabular-nums ${leading ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{option.votes} · {pct}%</span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                                <div className={`h-full rounded-full ${leading ? 'bg-orange-500' : 'bg-orange-200'}`} style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {sections.map(section => {
                        const rows = polls.filter(poll => poll.status === section.status && !poll.article_id)
                        return (
                            <section key={section.status}>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {section.title}
                                    <span className="ml-2 text-sm font-normal text-gray-400">{rows.length}</span>
                                </h2>
                                <p className="text-xs text-gray-500 mb-3">{section.hint}</p>
                                {rows.length === 0 ? (
                                    <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                                        {section.status === 'approved' ? 'Queue is empty — the current question will stay up until you add more.' : 'Nothing here.'}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {rows.map(poll => (
                                            <div key={poll.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900">{poll.question}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {poll.category} · {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
                                                            {poll.activated_at && ` · live ${new Date(poll.activated_at).toLocaleDateString('en-CA')}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {poll.status === 'draft' && (
                                                            <button onClick={() => act(poll.id, 'approve')} disabled={busyId === poll.id}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                                                                <Check className="w-3.5 h-3.5" /> Approve
                                                            </button>
                                                        )}
                                                        {poll.status === 'approved' && (
                                                            <button onClick={() => act(poll.id, 'activate')} disabled={busyId === poll.id}
                                                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50">
                                                                Make live now
                                                            </button>
                                                        )}
                                                        {poll.status === 'active' && (
                                                            <button onClick={() => act(poll.id, 'close')} disabled={busyId === poll.id}
                                                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                                                                Close early
                                                            </button>
                                                        )}
                                                        {poll.status !== 'active' && (
                                                            <button onClick={() => remove(poll.id, poll.question)} disabled={busyId === poll.id}
                                                                aria-label="Delete question"
                                                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {(poll.status === 'active' || poll.status === 'done') && poll.totalVotes > 0 && (
                                                    <div className="mt-3 space-y-1.5">
                                                        {poll.options.map(option => {
                                                            const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0
                                                            return (
                                                                <div key={option.id}>
                                                                    <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                                                                        <span>{option.label}</span>
                                                                        <span className="tabular-nums">{option.votes} · {pct}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                                        <div className="h-full rounded-full bg-orange-300" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )
                    })}

                    <section className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-gray-400" /> Add a question
                        </h2>
                        <div className="space-y-3">
                            <input
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                placeholder="Best shawarma in Alberta — where do you go?"
                                maxLength={200}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                            <textarea
                                value={optionsText}
                                onChange={e => setOptionsText(e.target.value)}
                                placeholder={'One option per line (2-5)\nOption A\nOption B'}
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button
                                    onClick={create}
                                    disabled={creating || !question.trim() || optionsText.split('\n').filter(s => s.trim()).length < 2}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40"
                                >
                                    {creating ? 'Adding…' : 'Add to queue'}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}
