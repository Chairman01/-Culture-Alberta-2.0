'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Loader2, MessageSquare } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface NotificationRow {
    id: string
    type: string
    actor_name: string | null
    excerpt: string | null
    article_slug: string | null
    article_id: string | null
    read: boolean
    created_at: string
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function NotificationsBell() {
    const { user } = useAuth()
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [unread, setUnread] = useState(0)
    const [items, setItems] = useState<NotificationRow[] | null>(null)
    const wrapRef = useRef<HTMLDivElement>(null)

    const fetchUnread = useCallback(async () => {
        const { count } = await supabaseBrowser
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('read', false)
        setUnread(count ?? 0)
    }, [])

    const fetchList = useCallback(async () => {
        const { data } = await supabaseBrowser
            .from('notifications')
            .select('id, type, actor_name, excerpt, article_slug, article_id, read, created_at')
            .order('created_at', { ascending: false })
            .limit(15)
        setItems((data as NotificationRow[]) || [])
    }, [])

    // Initial unread count + refresh when the tab regains focus (cheap, no polling).
    useEffect(() => {
        if (!user) {
            setUnread(0)
            setItems(null)
            return
        }
        fetchUnread()
        const onFocus = () => fetchUnread()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [user, fetchUnread])

    // Close on outside click.
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [])

    if (!user) return null

    const toggle = () => {
        const next = !open
        setOpen(next)
        if (next) fetchList()
    }

    const markAllRead = async () => {
        await supabaseBrowser.from('notifications').update({ read: true }).eq('read', false)
        setUnread(0)
        setItems((prev) => (prev || []).map((n) => ({ ...n, read: true })))
    }

    const openNotification = async (n: NotificationRow) => {
        setOpen(false)
        if (!n.read) {
            supabaseBrowser.from('notifications').update({ read: true }).eq('id', n.id).then(() => {})
            setUnread((u) => Math.max(0, u - 1))
        }
        const dest = n.article_slug || n.article_id
        if (dest) router.push(`/articles/${dest}#comments`)
    }

    const badge = unread > 9 ? '9+' : String(unread)

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={toggle}
                className="relative flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            >
                <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-900">Notifications</span>
                        {unread > 0 && (
                            <button type="button" onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-auto">
                        {items === null ? (
                            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                        ) : items.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                You’re all caught up.
                            </div>
                        ) : (
                            <ul>
                                {items.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            type="button"
                                            onClick={() => openNotification(n)}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.read ? '' : 'bg-blue-50/50'}`}
                                        >
                                            <p className="text-sm text-gray-800">
                                                <span className="font-semibold">{n.actor_name || 'Someone'}</span> replied to your comment
                                            </p>
                                            {n.excerpt && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">“{n.excerpt}”</p>}
                                            <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
