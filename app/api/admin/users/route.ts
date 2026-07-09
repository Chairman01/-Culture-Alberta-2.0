import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface ShapedUser {
    id: string
    email: string | null
    name: string | null
    city: string | null
    provider: string
    created_at: string | undefined
    last_sign_in_at: string | null
    newsletter: 'active' | 'unsubscribed' | null
    comments: number
    saved: number
}

// GET: all members grouped + sorted by city (admin only).
// City lives in auth.users.user_metadata.city, so it must be read via the
// service-role admin API, not a normal table query. Each member is enriched
// with newsletter status and engagement counts (comments, saved articles).
export async function GET(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const supabase = getServiceClient()

        // Page through every user (cap at 10 pages × 1000 = 10k as a safety net).
        const all: ShapedUser[] = []
        const perPage = 1000
        for (let page = 1; page <= 10; page++) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
            if (error) throw error
            const users = data?.users ?? []
            for (const u of users) {
                const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; city?: string }
                all.push({
                    id: u.id,
                    email: u.email ?? null,
                    name: meta.full_name || meta.name || null,
                    city: meta.city || null,
                    provider: (u.app_metadata?.provider as string) || 'email',
                    created_at: u.created_at,
                    last_sign_in_at: u.last_sign_in_at ?? null,
                    newsletter: null,
                    comments: 0,
                    saved: 0,
                })
            }
            if (users.length < perPage) break
        }

        const ids = all.map((u) => u.id)

        // Newsletter status: page through the whole table (it can exceed the
        // 1000-row select cap) and match by lowercased email.
        const newsletterByEmail = new Map<string, string>()
        for (let from = 0; ; from += 1000) {
            const { data, error } = await supabase
                .from('newsletter_subscriptions')
                .select('email, status')
                .range(from, from + 999)
            if (error) throw error
            const rows = data ?? []
            for (const r of rows) {
                if (r.email) newsletterByEmail.set(String(r.email).toLowerCase(), r.status)
            }
            if (rows.length < 1000) break
        }

        // Engagement counts, matched on user_id (fine to fetch in one go at
        // current scale since we filter to known member ids).
        const [commentsRes, savedRes] = await Promise.all([
            supabase.from('comments').select('user_id').in('user_id', ids),
            supabase.from('saved_articles').select('user_id').in('user_id', ids),
        ])
        const commentCounts = new Map<string, number>()
        for (const row of commentsRes.data ?? []) {
            if (row.user_id) commentCounts.set(row.user_id, (commentCounts.get(row.user_id) ?? 0) + 1)
        }
        const savedCounts = new Map<string, number>()
        for (const row of savedRes.data ?? []) {
            if (row.user_id) savedCounts.set(row.user_id, (savedCounts.get(row.user_id) ?? 0) + 1)
        }

        for (const u of all) {
            const nl = u.email ? newsletterByEmail.get(u.email.toLowerCase()) : undefined
            u.newsletter = nl === 'active' ? 'active' : nl ? 'unsubscribed' : null
            u.comments = commentCounts.get(u.id) ?? 0
            u.saved = savedCounts.get(u.id) ?? 0
        }

        // Group by city; users with no city land under "No city".
        const byCity = new Map<string, ShapedUser[]>()
        for (const u of all) {
            const key = u.city || 'No city'
            const arr = byCity.get(key) ?? []
            arr.push(u)
            byCity.set(key, arr)
        }

        const groups = Array.from(byCity.entries())
            .map(([city, users]) => ({
                city,
                count: users.length,
                users: users.sort((a, b) =>
                    (a.name || a.email || '').localeCompare(b.name || b.email || '')
                ),
            }))
            // Biggest cities first; "No city" always last.
            .sort((a, b) => {
                if (a.city === 'No city') return 1
                if (b.city === 'No city') return -1
                return b.count - a.count || a.city.localeCompare(b.city)
            })

        const now = Date.now()
        const DAY = 24 * 60 * 60 * 1000
        const activeLast30 = all.filter(
            (u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 30 * DAY
        ).length

        return NextResponse.json({
            total: all.length,
            withCity: all.filter((u) => u.city).length,
            onNewsletter: all.filter((u) => u.newsletter === 'active').length,
            activeLast30,
            groups,
        })
    } catch (e) {
        console.error('[admin users] error:', e)
        return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
    }
}
