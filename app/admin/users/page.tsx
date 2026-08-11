'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle, ArrowDown, ArrowUp, LayoutList, Loader2, Mail, MapPin,
    MessageSquare, RefreshCw, Rows3, Search, Trash2, Users,
} from 'lucide-react'
import { sortUsers, matchesQuery, DEFAULT_DIR, type SortKey, type SortDir } from './sorting'

interface AdminUser {
    id: string
    email: string | null
    name: string | null
    city: string | null
    provider: string
    created_at?: string
    last_sign_in_at: string | null
    newsletter: 'active' | 'unsubscribed' | null
    /** Which city edition they receive, e.g. 'calgary'. */
    newsletterCity: string | null
    /** Their list doesn't match the city on their profile. */
    newsletterMismatch: boolean
    comments: number
    saved: number
}

/** Slug → label, for the newsletter column. */
const LIST_LABELS: Record<string, string> = {
    edmonton: 'Edmonton', calgary: 'Calgary', lethbridge: 'Lethbridge',
    'red-deer': 'Red Deer', 'grande-prairie': 'Grande Prairie',
    'fort-mcmurray': 'Fort McMurray', 'medicine-hat': 'Medicine Hat',
}

/** Buckets the send route never delivers to — subscribers here receive nothing. */
function isDeadList(city: string | null): boolean {
    return !!city && !(city in LIST_LABELS)
}

/** Profile city label → list slug, e.g. "Red Deer" → "red-deer". */
function toListSlug(city: string): string {
    return city.trim().toLowerCase().replace(/\s+/g, '-')
}

interface CityGroup {
    city: string
    count: number
    users: AdminUser[]
}

/** A user with its group's city resolved, for the flat view. */
type FlatUser = AdminUser & { cityLabel: string }

type View = 'city' | 'all'

function fmt(iso?: string | null): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
        return '—'
    }
}

/** "Today", "3d ago", "2w ago", "5mo ago" — quick recency read for the sign-in column. */
function ago(iso?: string | null): string {
    if (!iso) return 'Never'
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days <= 0) return 'Today'
    if (days < 7) return `${days}d ago`
    if (days < 60) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
}

export default function AdminUsersByCity() {
    const [groups, setGroups] = useState<CityGroup[] | null>(null)
    const [stats, setStats] = useState({ total: 0, withCity: 0, onNewsletter: 0, activeLast30: 0 })
    const [error, setError] = useState('')
    const [view, setView] = useState<View>('city')
    const [cityOrder, setCityOrder] = useState<'count' | 'name'>('count')
    const [sortKey, setSortKey] = useState<SortKey>('joined')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [query, setQuery] = useState('')
    const [refreshing, setRefreshing] = useState(false)
    const [savingEmail, setSavingEmail] = useState<string | null>(null)
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
    /** The member the "remove account" dialog is open for. */
    const [pendingDelete, setPendingDelete] = useState<FlatUser | null>(null)
    const [deleteComments, setDeleteComments] = useState(true)
    const [unsubscribe, setUnsubscribe] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [notice, setNotice] = useState('')

    const load = useCallback(async () => {
        setRefreshing(true)
        setError('')
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' })
            if (!res.ok) {
                setError(res.status === 401 ? 'Please sign in to the admin area.' : 'Failed to load users.')
                return
            }
            const data = await res.json()
            setGroups(data.groups || [])
            setStats({
                total: data.total || 0,
                withCity: data.withCity || 0,
                onNewsletter: data.onNewsletter || 0,
                activeLast30: data.activeLast30 || 0,
            })
            setFetchedAt(new Date())
        } catch {
            setError('Failed to load users.')
        } finally {
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    /**
     * Move a subscriber to a different city edition, updating the row in place
     * so the table doesn't reload and lose the reader's scroll position.
     */
    const changeNewsletter = useCallback(async (u: FlatUser, city: string) => {
        if (!u.email || !city || city === u.newsletterCity) return
        setSavingEmail(u.email)
        setError('')
        try {
            const res = await fetch('/api/admin/users/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: u.email, city }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Could not change newsletter.'); return }

            setGroups(prev => (prev ?? []).map(g => ({
                ...g,
                users: g.users.map(x =>
                    x.id === u.id
                        ? {
                            ...x,
                            newsletterCity: city,
                            // Recompute the flag rather than waiting for a refetch.
                            newsletterMismatch: !!x.city && toListSlug(x.city) !== city,
                        }
                        : x
                ),
            })))
        } catch {
            setError('Could not change newsletter.')
        } finally {
            setSavingEmail(null)
        }
    }, [])

    /** Open the removal dialog with the safe defaults re-selected each time. */
    const askToRemove = useCallback((u: FlatUser) => {
        setDeleteComments(true)
        setUnsubscribe(true)
        setError('')
        setNotice('')
        setPendingDelete(u)
    }, [])

    /**
     * Delete the account, then drop the row and adjust the tiles in place —
     * the numbers stay honest without a full refetch.
     */
    const removeMember = useCallback(async () => {
        const u = pendingDelete
        if (!u) return
        setDeleting(true)
        setError('')
        try {
            const qs = new URLSearchParams({
                comments: deleteComments ? 'delete' : 'keep',
                newsletter: unsubscribe ? 'unsubscribe' : 'keep',
            })
            const res = await fetch(`/api/admin/users/${u.id}?${qs}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Could not remove the account.'); return }

            setGroups(prev => (prev ?? []).map(g => {
                const had = g.users.some(x => x.id === u.id)
                return had
                    ? { ...g, count: g.count - 1, users: g.users.filter(x => x.id !== u.id) }
                    : g
            }).filter(g => g.count > 0))

            const wasActive = !!u.last_sign_in_at &&
                Date.now() - new Date(u.last_sign_in_at).getTime() <= 30 * 86400000
            setStats(s => ({
                total: s.total - 1,
                withCity: s.withCity - (u.city ? 1 : 0),
                onNewsletter: s.onNewsletter - (u.newsletter === 'active' ? 1 : 0),
                activeLast30: s.activeLast30 - (wasActive ? 1 : 0),
            }))

            const bits = [`Removed ${u.email || u.name || 'the account'}`]
            if (data.commentsRemoved) bits.push(`${data.commentsRemoved} comment${data.commentsRemoved === 1 ? '' : 's'} deleted`)
            if (data.commentsAnonymised) bits.push(`${data.commentsAnonymised} comment${data.commentsAnonymised === 1 ? '' : 's'} anonymised`)
            if (data.unsubscribed) bits.push('unsubscribed from the newsletter')
            setNotice(`${bits.join(' · ')}.`)
            setPendingDelete(null)
        } catch {
            setError('Could not remove the account.')
        } finally {
            setDeleting(false)
        }
    }, [pendingDelete, deleteComments, unsubscribe])

    /** Clicking a column sorts by it; clicking the active column flips direction. */
    const toggleSort = (key: SortKey) => {
        if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        else { setSortKey(key); setSortDir(DEFAULT_DIR[key]) }
    }

    const matches = useCallback((u: FlatUser) => matchesQuery(u, query), [query])

    /** Every member as one list, used by the flat view and the result counts. */
    const allUsers = useMemo<FlatUser[]>(() => {
        if (!groups) return []
        return groups.flatMap(g => g.users.map(u => ({ ...u, cityLabel: u.city || g.city })))
    }, [groups])

    const flatUsers = useMemo(
        () => sortUsers(allUsers.filter(matches), sortKey, sortDir),
        [allUsers, matches, sortKey, sortDir]
    )

    /** City view: groups ordered as chosen, members inside sorted the same way as the flat view. */
    const sortedGroups = useMemo(() => {
        if (!groups) return null
        const g = groups
            .map(group => ({
                ...group,
                users: sortUsers(
                    group.users
                        .map(u => ({ ...u, cityLabel: u.city || group.city }))
                        .filter(matches),
                    sortKey,
                    sortDir
                ),
            }))
            .filter(group => group.users.length > 0)

        if (cityOrder === 'name') {
            g.sort((a, b) => {
                if (a.city === 'No city') return 1
                if (b.city === 'No city') return -1
                return a.city.localeCompare(b.city)
            })
        } else {
            g.sort((a, b) => b.count - a.count)
        }
        return g
    }, [groups, cityOrder, sortKey, sortDir, matches])

    /** Which edition each member receives, plus anything needing review. */
    const newsletterBreakdown = useMemo(() => {
        const counts = new Map<string, number>()
        let notSubscribed = 0
        let deadListMembers = 0
        const mismatched: FlatUser[] = []

        for (const u of allUsers) {
            if (u.newsletter !== 'active') { notSubscribed++; continue }
            const list = u.newsletterCity ?? 'unknown'
            counts.set(list, (counts.get(list) ?? 0) + 1)
            if (isDeadList(u.newsletterCity)) deadListMembers++
            if (u.newsletterMismatch) mismatched.push(u)
        }

        return {
            lists: [...counts.entries()].sort((a, b) => b[1] - a[1]),
            notSubscribed,
            deadListMembers,
            mismatched,
        }
    }, [allUsers])

    const tiles = [
        { label: 'Members', value: stats.total, icon: Users, tone: 'text-gray-900' },
        { label: 'With a city', value: stats.withCity, icon: MapPin, tone: 'text-blue-700' },
        { label: 'On the newsletter', value: stats.onNewsletter, icon: Mail, tone: 'text-emerald-700' },
        { label: 'Active last 30 days', value: stats.activeLast30, icon: MessageSquare, tone: 'text-amber-700' },
    ]

    const SORTS: Array<{ key: SortKey; label: string }> = [
        { key: 'joined', label: 'Joined' },
        { key: 'signin', label: 'Last sign in' },
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'comments', label: 'Comments' },
        { key: 'saved', label: 'Saved' },
    ]

    /** Clickable header cell. */
    const Th = ({ label, sk, align = 'left' }: { label: string; sk?: SortKey; align?: 'left' | 'right' }) => (
        <th className={`px-4 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
            {sk ? (
                <button
                    onClick={() => toggleSort(sk)}
                    className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortKey === sk ? 'text-gray-900 font-semibold' : ''}`}
                >
                    {label}
                    {sortKey === sk && (sortDir === 'asc'
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />)}
                </button>
            ) : label}
        </th>
    )

    const Row = ({ u, showCity }: { u: FlatUser; showCity?: boolean }) => (
        <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
            <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{u.name || '—'}</td>
            <td className="px-4 py-2 text-gray-600">{u.email || '—'}</td>
            {showCity && (
                <td className="px-4 py-2 whitespace-nowrap">
                    {u.cityLabel === 'No city'
                        ? <span className="text-gray-300">—</span>
                        : <span className="text-gray-700">{u.cityLabel}</span>}
                </td>
            )}
            <td className="px-4 py-2 text-gray-600 capitalize">{u.provider}</td>
            <td className="px-4 py-2 whitespace-nowrap">
                {u.newsletter === 'active' ? (
                    <span className="inline-flex items-center gap-1.5">
                        {/* Editable in place — pick a city to move them. */}
                        <select
                            value={u.newsletterCity ?? ''}
                            disabled={savingEmail === u.email}
                            onChange={e => changeNewsletter(u, e.target.value)}
                            aria-label={`Newsletter for ${u.email}`}
                            className={`rounded-md border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                                u.newsletterMismatch
                                    ? 'bg-amber-100 text-amber-900'
                                    : isDeadList(u.newsletterCity)
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-emerald-50 text-emerald-800'
                            }`}
                        >
                            {/* Present but unselectable: these buckets never send. */}
                            {isDeadList(u.newsletterCity) && (
                                <option value={u.newsletterCity ?? ''} disabled>
                                    {u.newsletterCity} (never sends)
                                </option>
                            )}
                            {Object.entries(LIST_LABELS).map(([slug, label]) => (
                                <option key={slug} value={slug}>{label}</option>
                            ))}
                        </select>
                        {savingEmail === u.email && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                        {u.newsletterMismatch && savingEmail !== u.email && (
                            <button
                                onClick={() => changeNewsletter(u, toListSlug(u.cityLabel))}
                                title={`Profile says ${u.cityLabel} — click to move them there`}
                                className="text-xs font-medium text-amber-700 underline"
                            >
                                ≠ {u.cityLabel}
                            </button>
                        )}
                    </span>
                ) : u.newsletter === 'unsubscribed' ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Unsubscribed</span>
                ) : (
                    <span className="text-gray-300" title="Not subscribed — readers must opt in themselves">—</span>
                )}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-gray-600">{u.comments || '—'}</td>
            <td className="px-4 py-2 text-right tabular-nums text-gray-600">{u.saved || '—'}</td>
            <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt(u.created_at)}</td>
            <td className="px-4 py-2 text-gray-500 whitespace-nowrap" title={fmt(u.last_sign_in_at)}>{ago(u.last_sign_in_at)}</td>
            <td className="px-4 py-2 text-right">
                <button
                    onClick={() => askToRemove(u)}
                    title={`Remove ${u.email || u.name || 'this account'}`}
                    aria-label={`Remove ${u.email || u.name || 'this account'}`}
                    className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900">Members</h1>
                </div>
                <div className="flex items-center gap-3">
                    {fetchedAt && (
                        <span className="text-xs text-gray-400">
                            Updated {fetchedAt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={load}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Everyone with an account. Newsletter status and engagement (comments, saved articles)
                are matched from your other tables. Data is pulled live from the database every time
                you open or refresh this page.
            </p>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
            {notice && (
                <div className="mb-4 flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                    <span>{notice}</span>
                    <button onClick={() => setNotice('')} className="font-medium hover:underline">Dismiss</button>
                </div>
            )}

            {groups === null && !error ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : groups && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {tiles.map((t) => (
                            <div key={t.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                    <t.icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </div>
                                <div className={`text-2xl font-bold ${t.tone}`}>{t.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Newsletter breakdown ─────────────────────────────── */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">Which newsletter each member gets</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Members with an account, grouped by the edition they actually receive.
                            Anything flagged below is worth a look.
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {newsletterBreakdown.lists.map(([list, n]) => (
                                <span
                                    key={list}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                                        isDeadList(list)
                                            ? 'bg-red-50 text-red-800 border border-red-200'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    <span className="font-semibold">{LIST_LABELS[list] ?? list}</span>
                                    <span className="tabular-nums">{n}</span>
                                    {isDeadList(list) && <span className="text-xs">· never sends</span>}
                                </span>
                            ))}
                            {newsletterBreakdown.notSubscribed > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-500 border border-gray-200">
                                    <span className="font-semibold">Not subscribed</span>
                                    <span className="tabular-nums">{newsletterBreakdown.notSubscribed}</span>
                                </span>
                            )}
                        </div>

                        {newsletterBreakdown.mismatched.length > 0 && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-sm font-semibold text-amber-900">
                                    {newsletterBreakdown.mismatched.length} member
                                    {newsletterBreakdown.mismatched.length === 1 ? '' : 's'} on a list that
                                    doesn&apos;t match their profile city
                                </p>
                                <ul className="mt-2 space-y-1 text-sm text-amber-900">
                                    {newsletterBreakdown.mismatched.map(u => (
                                        <li key={u.id}>
                                            {u.email} — profile says <strong>{u.cityLabel}</strong>, receiving{' '}
                                            <strong>{LIST_LABELS[u.newsletterCity!] ?? u.newsletterCity}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {newsletterBreakdown.deadListMembers > 0 && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                                <strong>{newsletterBreakdown.deadListMembers} member
                                {newsletterBreakdown.deadListMembers === 1 ? ' is' : 's are'} on a list that never
                                sends.</strong> They opted in and receive nothing. They need moving to a real
                                edition, or asking which city they want.
                            </div>
                        )}
                    </div>

                    {/* ── Controls ─────────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-5 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                                <button
                                    onClick={() => setView('city')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'city' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <LayoutList className="w-4 h-4" /> By city
                                </button>
                                <button
                                    onClick={() => setView('all')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <Rows3 className="w-4 h-4" /> All members
                                </button>
                            </div>

                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search name, email, city or provider…"
                                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-gray-500">Sort members by</span>
                            {SORTS.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => toggleSort(s.key)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${sortKey === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    {s.label}
                                    {sortKey === s.key && (sortDir === 'asc'
                                        ? <ArrowUp className="w-3 h-3" />
                                        : <ArrowDown className="w-3 h-3" />)}
                                </button>
                            ))}
                            <span className="text-xs text-gray-400 ml-1">
                                {sortKey === 'joined' && (sortDir === 'desc' ? 'newest first' : 'oldest first')}
                                {sortKey === 'signin' && (sortDir === 'desc' ? 'most recent first' : 'least recent first')}
                            </span>

                            {view === 'city' && (
                                <span className="flex items-center gap-2 ml-auto">
                                    <span className="text-gray-500">Cities by</span>
                                    <button onClick={() => setCityOrder('count')} className={`px-2.5 py-1 rounded-lg font-medium ${cityOrder === 'count' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>Most members</button>
                                    <button onClick={() => setCityOrder('name')} className={`px-2.5 py-1 rounded-lg font-medium ${cityOrder === 'name' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>A–Z</button>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
                        <span>
                            {view === 'city'
                                ? `${sortedGroups?.length ?? 0} ${sortedGroups?.length === 1 ? 'city' : 'cities'}`
                                : `${flatUsers.length} of ${allUsers.length} members`}
                        </span>
                        {query && (
                            <button onClick={() => setQuery('')} className="font-medium text-blue-600 hover:underline">
                                Clear search
                            </button>
                        )}
                    </div>

                    {/* ── All members: one flat, sortable table ────────────── */}
                    {view === 'all' ? (
                        flatUsers.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-500">
                                No members match “{query}”.
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                                                <Th label="Name" sk="name" />
                                                <Th label="Email" />
                                                <Th label="City" sk="city" />
                                                <Th label="Provider" />
                                                <Th label="Newsletter" />
                                                <Th label="Comments" sk="comments" align="right" />
                                                <Th label="Saved" sk="saved" align="right" />
                                                <Th label="Joined" sk="joined" />
                                                <Th label="Last sign in" sk="signin" />
                                                <Th label="" align="right" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {flatUsers.map(u => <Row key={u.id} u={u} showCity />)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        /* ── By city: the grouped view ────────────────────── */
                        sortedGroups?.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-500">
                                No members match “{query}”.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedGroups?.map((g) => (
                                    <section key={g.city} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <header className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <MapPin className={`w-4 h-4 ${g.city === 'No city' ? 'text-gray-300' : 'text-blue-500'}`} />
                                                <h2 className="font-semibold text-gray-900">{g.city}</h2>
                                            </div>
                                            <span className="text-sm font-medium text-gray-500">
                                                {query
                                                    ? `${g.users.length} of ${g.count} shown`
                                                    : `${g.count} ${g.count === 1 ? 'member' : 'members'}`}
                                            </span>
                                        </header>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                                        <Th label="Name" sk="name" />
                                                        <Th label="Email" />
                                                        <Th label="Provider" />
                                                        <Th label="Newsletter" />
                                                        <Th label="Comments" sk="comments" align="right" />
                                                        <Th label="Saved" sk="saved" align="right" />
                                                        <Th label="Joined" sk="joined" />
                                                        <Th label="Last sign in" sk="signin" />
                                                        <Th label="" align="right" />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {g.users.map(u => <Row key={u.id} u={u} />)}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}

            {/* ── Remove account confirmation ──────────────────────────── */}
            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => !deleting && setPendingDelete(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Remove account"
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-xl bg-white shadow-xl"
                    >
                        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
                            <div className="rounded-full bg-red-50 p-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Remove this account?</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    <strong>{pendingDelete.name || 'No name'}</strong> — {pendingDelete.email || 'no email'}
                                    {pendingDelete.cityLabel !== 'No city' && ` · ${pendingDelete.cityLabel}`}
                                </p>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 text-sm">
                            <p className="text-gray-600">
                                They&apos;ll be signed out for good and can&apos;t get back in. Their saved
                                articles{pendingDelete.saved ? ` (${pendingDelete.saved})` : ''}, saved jobs
                                and reply notifications go with the account. This can&apos;t be undone.
                            </p>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deleteComments}
                                    onChange={e => setDeleteComments(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">
                                    Delete their comments{pendingDelete.comments ? ` (${pendingDelete.comments})` : ''}
                                    <span className="block text-xs text-gray-500">
                                        Unchecked, the comments stay on the site as “Former member” with the
                                        name and email stripped off.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={unsubscribe}
                                    onChange={e => setUnsubscribe(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">
                                    Unsubscribe them from the newsletter
                                    <span className="block text-xs text-gray-500">
                                        The subscription is keyed by email, so it outlives the account.
                                        Leave this on unless they still want the emails.
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 px-5 py-4 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setPendingDelete(null)}
                                disabled={deleting}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={removeMember}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {deleting ? 'Removing…' : 'Permanently remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
