'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, MapPin, MessageSquare, RefreshCw, Users } from 'lucide-react'

interface AdminUser {
    id: string
    email: string | null
    name: string | null
    city: string | null
    provider: string
    created_at?: string
    last_sign_in_at: string | null
    newsletter: 'active' | 'unsubscribed' | null
    comments: number
    saved: number
}

interface CityGroup {
    city: string
    count: number
    users: AdminUser[]
}

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
    const [sortBy, setSortBy] = useState<'count' | 'name'>('count')
    const [refreshing, setRefreshing] = useState(false)
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null)

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

    useEffect(() => {
        load()
    }, [load])

    const sortedGroups = useMemo(() => {
        if (!groups) return null
        const g = [...groups]
        if (sortBy === 'name') {
            g.sort((a, b) => {
                if (a.city === 'No city') return 1
                if (b.city === 'No city') return -1
                return a.city.localeCompare(b.city)
            })
        }
        return g
    }, [groups, sortBy])

    const tiles = [
        { label: 'Members', value: stats.total, icon: Users, tone: 'text-gray-900' },
        { label: 'With a city', value: stats.withCity, icon: MapPin, tone: 'text-blue-700' },
        { label: 'On the newsletter', value: stats.onNewsletter, icon: Mail, tone: 'text-emerald-700' },
        { label: 'Active last 30 days', value: stats.activeLast30, icon: MessageSquare, tone: 'text-amber-700' },
    ]

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
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
                Everyone with an account, grouped by the city on their profile. Newsletter status and
                engagement (comments, saved articles) are matched from your other tables. Data is
                pulled live from the database every time you open or refresh this page.
            </p>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

            {sortedGroups === null && !error ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : sortedGroups && (
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

                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <span className="text-sm text-gray-500">{sortedGroups.length} cities</span>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Sort cities by</span>
                            <button onClick={() => setSortBy('count')} className={`px-3 py-1.5 rounded-lg font-medium ${sortBy === 'count' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Most members</button>
                            <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg font-medium ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>A–Z</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {sortedGroups.map((g) => (
                            <section key={g.city} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <header className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <MapPin className={`w-4 h-4 ${g.city === 'No city' ? 'text-gray-300' : 'text-blue-500'}`} />
                                        <h2 className="font-semibold text-gray-900">{g.city}</h2>
                                    </div>
                                    <span className="text-sm font-medium text-gray-500">{g.count} {g.count === 1 ? 'member' : 'members'}</span>
                                </header>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                                <th className="px-4 py-2 font-medium">Name</th>
                                                <th className="px-4 py-2 font-medium">Email</th>
                                                <th className="px-4 py-2 font-medium">Provider</th>
                                                <th className="px-4 py-2 font-medium">Newsletter</th>
                                                <th className="px-4 py-2 font-medium text-right">Comments</th>
                                                <th className="px-4 py-2 font-medium text-right">Saved</th>
                                                <th className="px-4 py-2 font-medium">Joined</th>
                                                <th className="px-4 py-2 font-medium">Last sign in</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.users.map((u) => (
                                                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                                                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{u.name || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-600">{u.email || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-600 capitalize">{u.provider}</td>
                                                    <td className="px-4 py-2">
                                                        {u.newsletter === 'active' ? (
                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Subscribed</span>
                                                        ) : u.newsletter === 'unsubscribed' ? (
                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Unsubscribed</span>
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">{u.comments || '—'}</td>
                                                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">{u.saved || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt(u.created_at)}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap" title={fmt(u.last_sign_in_at)}>{ago(u.last_sign_in_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
