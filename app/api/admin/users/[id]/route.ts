/**
 * Remove a member's account (admin only).
 *
 * Deleting the auth user takes their private data with it — saved articles,
 * saved jobs and reply notifications all cascade. Two things do NOT cascade
 * the way you'd want, so they're handled here explicitly:
 *
 *   - Comments. The foreign key is ON DELETE SET NULL, so a deleted member's
 *     comments would otherwise stay on the site with their name and email
 *     still attached. `comments=delete` (the default) removes them; anything
 *     else anonymises them so the thread stays readable.
 *   - The newsletter subscription, which is keyed by email and knows nothing
 *     about accounts. `newsletter=unsubscribe` (the default) stops it, so a
 *     removed member doesn't keep receiving mail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })

    const url = new URL(request.url)
    const deleteComments = url.searchParams.get('comments') !== 'keep'
    const unsubscribe = url.searchParams.get('newsletter') !== 'keep'

    try {
        const supabase = getServiceClient()

        const { data: found, error: findErr } = await supabase.auth.admin.getUserById(id)
        if (findErr || !found?.user) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }
        const email = found.user.email ?? null

        // Comments first — once the auth user is gone the user_id link is
        // nulled and there's no way left to find them.
        let commentsRemoved = 0
        let commentsAnonymised = 0
        if (deleteComments) {
            const { data, error } = await supabase
                .from('comments')
                .delete()
                .eq('user_id', id)
                .select('id')
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            commentsRemoved = data?.length ?? 0
        } else {
            const { data, error } = await supabase
                .from('comments')
                .update({ author_name: 'Former member', author_email: null })
                .eq('user_id', id)
                .select('id')
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            commentsAnonymised = data?.length ?? 0
        }

        let unsubscribed = false
        if (unsubscribe && email) {
            const { data } = await supabase
                .from('newsletter_subscriptions')
                .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
                .eq('email', email.toLowerCase())
                .eq('status', 'active')
                .select('id')
            unsubscribed = (data?.length ?? 0) > 0
        }

        // Saved articles, saved jobs and notifications cascade from here.
        const { error: delErr } = await supabase.auth.admin.deleteUser(id)
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

        console.log(`[admin users] ${auth.username} deleted account ${email ?? id}`)

        return NextResponse.json({
            ok: true,
            email,
            commentsRemoved,
            commentsAnonymised,
            unsubscribed,
        })
    } catch (err) {
        console.error('[admin users] delete error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to remove member' },
            { status: 500 }
        )
    }
}
