import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getServiceClient } from '@/lib/supabase-admin'
import { sendWelcomeEmail } from '@/lib/welcome-email'

export const dynamic = 'force-dynamic'

// POST: send the one-time welcome email to the CURRENTLY signed-in user.
// Auth required (Bearer token) so it can only ever email the requester's own
// address — never an arbitrary one. Idempotent: a `welcomed` flag on the user
// prevents duplicate sends across logins.
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const meta = (user.user_metadata ?? {}) as { welcomed?: boolean; full_name?: string; city?: string }
    if (meta.welcomed) return NextResponse.json({ skipped: 'already_welcomed' })
    if (!user.email) return NextResponse.json({ skipped: 'no_email' })

    try {
        await sendWelcomeEmail({ email: user.email, name: meta.full_name, city: meta.city })
    } catch (e) {
        console.error('[welcome-email] send failed:', e)
        return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
    }

    // Mark as welcomed so we never send twice (merge to keep existing metadata).
    try {
        await getServiceClient().auth.admin.updateUserById(user.id, {
            user_metadata: { ...meta, welcomed: true },
        })
    } catch (e) {
        console.error('[welcome-email] flag update failed:', e)
    }

    return NextResponse.json({ sent: true })
}
