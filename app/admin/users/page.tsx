'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Users } from 'lucide-react'

interface AdminUser {
    id: string
    email: string | null
    name: string | null
    city: string | null
    provider: string
    created_at?: string
    last_sign_in_at: string | null
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

export default function AdminUsersByCity() {
    const [groups, setGroups] = useState<CityGroup[] | null>(null)
    const [total, setTotal] = useState(0)
    const [withCity, setWithCity] = useState(0)
    const [error, setError] = useState('')
    const [sortBy, setSortBy] = useState<'count' | 'name'>('count')

    useEffect(() => {
        ;(async () => {
            try {
                const res = await fetch('/api/admin/users')
                if (!res.ok) {
                    setError(res.status === 401 ? 'Please sign in to the admin area.' : 'Failed to load users.')
                    return
                }
                const data = await res.json()
                setGroups(data.groups || [])
                setTotal(data.total || 0)
                setWithCity(data.withCity || 0)
            } catch {
                setError('Failed to load users.')
            }
        })()
    }, [])

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

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center gap-2 mb-1">
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Members by City</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Accounts grouped by the city set on their profile (stored in <code>user_metadata.city</code>).
            </p>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

            {sortedGroups === null && !error ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : sortedGroups && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex gap-3 text-sm">
                            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{total} members</span>
                            <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium">{withCity} with a city</span>
                            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{sortedGroups.length} cities</span>
                        </div>
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
                                                <th className="px-4 py-2 font-medium">Joined</th>
                                                <th className="px-4 py-2 font-medium">Last sign in</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.users.map((u) => (
                                                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                                                    <td className="px-4 py-2 text-gray-900">{u.name || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-600">{u.email || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-600 capitalize">{u.provider}</td>
                                                    <td className="px-4 py-2 text-gray-500">{fmt(u.created_at)}</td>
                                                    <td className="px-4 py-2 text-gray-500">{fmt(u.last_sign_in_at)}</td>
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
