'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Loader2, MapPin, Mail, CalendarDays, Pencil, Check, X,
    MessageSquare, Bookmark, Trash2,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { CitySelect } from '@/components/city-select'
import { isValidCity } from '@/lib/alberta-municipalities'
import { listSavedArticles, unsaveArticle, type SavedArticleCard } from '@/lib/saved-articles'

function initialsOf(name: string): string {
    const w = name.trim().split(/\s+/)
    if (w.length >= 2 && w[0] && w[1]) return (w[0][0] + w[1][0]).toUpperCase()
    return name.trim().substring(0, 2).toUpperCase() || '?'
}

function formatDate(iso?: string): string {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
        return ''
    }
}

function articleHref(slug: string | null, id: string): string {
    return `/articles/${slug || id}`
}

interface MyComment {
    id: string
    content: string
    created_at: string
    article_id: string
    like_count: number | null
    slug: string | null
    title: string
}

export default function AccountPage() {
    const { user, loading } = useAuth()
    const router = useRouter()

    // Redirect signed-out visitors to sign in.
    useEffect(() => {
        if (!loading && !user) router.replace('/auth/signin?next=/account')
    }, [loading, user, router])

    const meta = (user?.user_metadata ?? {}) as {
        full_name?: string; city?: string; avatar_url?: string; picture?: string
    }
    const displayName = meta.full_name || user?.email || 'You'
    const avatar = meta.avatar_url || meta.picture || ''
    const city = meta.city || ''

    // --- profile edit ---
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editCity, setEditCity] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const startEdit = () => {
        setEditName(meta.full_name || '')
        setEditCity(city)
        setProfileMsg(null)
        setEditing(true)
    }

    const saveProfile = async () => {
        if (!isValidCity(editCity)) {
            setProfileMsg({ type: 'error', text: 'Please choose your city from the list.' })
            return
        }
        setSavingProfile(true)
        setProfileMsg(null)
        try {
            const { error } = await supabaseBrowser.auth.updateUser({
                data: { full_name: editName.trim() || displayName, city: editCity },
            })
            if (error) throw error
            setEditing(false)
            setProfileMsg({ type: 'success', text: 'Profile updated.' })
        } catch (err) {
            setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Could not save. Try again.' })
        } finally {
            setSavingProfile(false)
        }
    }

    // --- notification preference ---
    const emailOn = (user?.user_metadata as { reply_emails?: boolean } | undefined)?.reply_emails !== false
    const [savingPref, setSavingPref] = useState(false)
    const togglePref = async () => {
        setSavingPref(true)
        try {
            await supabaseBrowser.auth.updateUser({ data: { reply_emails: !emailOn } })
        } finally {
            setSavingPref(false)
        }
    }

    // --- tabs ---
    const [tab, setTab] = useState<'comments' | 'saved'>('comments')

    if (loading || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            {/* Profile header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                                {initialsOf(displayName)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {!editing ? (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900 truncate">{displayName}</h1>
                                    <button
                                        type="button"
                                        onClick={startEdit}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 flex-shrink-0"
                                    >
                                        <Pencil className="w-4 h-4" /> Edit
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {city && (
                                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{city}</p>
                                    )}
                                    {user.email && (
                                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{user.email}</p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-gray-400" />Member since {formatDate(user.created_at)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Display name</label>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        maxLength={100}
                                        disabled={savingProfile}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                                    <CitySelect value={editCity} onChange={setEditCity} disabled={savingProfile} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={saveProfile}
                                        disabled={savingProfile}
                                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                                    >
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        disabled={savingProfile}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2"
                                    >
                                        <X className="w-4 h-4" /> Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {profileMsg && (
                    <p className={`mt-3 text-sm ${profileMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                        {profileMsg.text}
                    </p>
                )}
            </div>

            {/* Notification settings */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4">
                <div>
                    <p className="font-semibold text-gray-900">Email me about replies</p>
                    <p className="text-sm text-gray-500">Get an email when someone replies to your comment.</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={emailOn}
                    onClick={togglePref}
                    disabled={savingPref}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${emailOn ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${emailOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="mt-8 flex items-center gap-1 border-b border-gray-200">
                <TabButton active={tab === 'comments'} onClick={() => setTab('comments')} icon={<MessageSquare className="w-4 h-4" />} label="My comments" />
                <TabButton active={tab === 'saved'} onClick={() => setTab('saved')} icon={<Bookmark className="w-4 h-4" />} label="Saved articles" />
            </div>

            <div className="mt-6">
                {tab === 'comments' ? <MyComments userId={user.id} /> : <SavedArticles />}
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {icon}{label}
        </button>
    )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="text-center py-12 text-gray-500">
            <div className="flex justify-center mb-3 text-gray-300">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    )
}

function MyComments({ userId }: { userId: string }) {
    const [comments, setComments] = useState<MyComment[] | null>(null)

    useEffect(() => {
        let active = true
        ;(async () => {
            const { data } = await supabaseBrowser
                .from('comments')
                .select('id, content, created_at, article_id, like_count')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50)
            const rows = data || []
            const ids = [...new Set(rows.map((r) => r.article_id))]
            let byId = new Map<string, { slug: string | null; title: string }>()
            if (ids.length) {
                const { data: arts } = await supabaseBrowser
                    .from('articles')
                    .select('id, slug, title')
                    .in('id', ids)
                byId = new Map((arts || []).map((a) => [a.id, { slug: a.slug ?? null, title: a.title }]))
            }
            if (!active) return
            setComments(rows.map((r) => ({
                ...r,
                slug: byId.get(r.article_id)?.slug ?? null,
                title: byId.get(r.article_id)?.title ?? 'View article',
            })))
        })()
        return () => { active = false }
    }, [userId])

    if (comments === null) return <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto my-8" />
    if (comments.length === 0) return <EmptyState icon={<MessageSquare className="w-10 h-10" />} text="You haven't posted any comments yet." />

    return (
        <ul className="space-y-4">
            {comments.map((c) => (
                <li key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{c.content}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDate(c.created_at)}</span>
                        {(c.like_count ?? 0) > 0 && <span>· {c.like_count} likes</span>}
                        <Link href={articleHref(c.slug, c.article_id)} className="text-blue-600 hover:underline ml-auto font-medium">
                            On “{c.title}” →
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    )
}

function SavedArticles() {
    const [items, setItems] = useState<SavedArticleCard[] | null>(null)
    const [removing, setRemoving] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setItems(await listSavedArticles())
        } catch {
            setItems([])
        }
    }, [])

    useEffect(() => { load() }, [load])

    const remove = async (id: string) => {
        setRemoving(id)
        try {
            await unsaveArticle(id)
            setItems((prev) => (prev || []).filter((x) => x.id !== id))
        } finally {
            setRemoving(null)
        }
    }

    if (items === null) return <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto my-8" />
    if (items.length === 0) return <EmptyState icon={<Bookmark className="w-10 h-10" />} text="No saved articles yet. Tap “Save” on any article to keep it here." />

    return (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((a) => (
                <li key={a.id} className="group bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                    <Link href={articleHref(a.slug, a.id)} className="block">
                        <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                            {a.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={a.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            )}
                        </div>
                        <div className="p-3">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">{a.title}</h3>
                            <p className="mt-1 text-xs text-gray-500">Saved {formatDate(a.savedAt)}</p>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={removing === a.id}
                        className="mt-auto flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 border-t border-gray-100 py-2 disabled:opacity-50"
                    >
                        {removing === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Remove
                    </button>
                </li>
            ))}
        </ul>
    )
}
