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
}

// GET: all members grouped + sorted by city (admin only).
// City lives in auth.users.user_metadata.city, so it must be read via the
// service-role admin API, not a normal table query.
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
                })
            }
            if (users.length < perPage) break
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

        return NextResponse.json({ total: all.length, withCity: all.filter((u) => u.city).length, groups })
    } catch (e) {
        console.error('[admin users] error:', e)
        return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
    }
}
