import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH { action } — approve | activate | close | draft
//   approve:  draft → approved (joins the rotation queue)
//   activate: make this the live poll NOW (closes the current one)
//   close:    active → done
//   draft:    back to draft (pulled from the queue)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { id } = await params
        const body = await request.json()
        const action: unknown = body?.action
        const supabase = getServiceClient()

        if (action === 'approve') {
            const { error } = await supabase.from('polls').update({ status: 'approved' }).eq('id', id).eq('status', 'draft')
            if (error) throw error
        } else if (action === 'draft') {
            const { error } = await supabase.from('polls').update({ status: 'draft' }).eq('id', id).eq('status', 'approved')
            if (error) throw error
        } else if (action === 'close') {
            const { error } = await supabase
                .from('polls')
                .update({ status: 'done', closed_at: new Date().toISOString() })
                .eq('id', id)
                .eq('status', 'active')
            if (error) throw error
        } else if (action === 'activate') {
            const { error: closeErr } = await supabase
                .from('polls')
                .update({ status: 'done', closed_at: new Date().toISOString() })
                .eq('status', 'active')
                .neq('id', id)
            if (closeErr) throw closeErr
            const { error } = await supabase
                .from('polls')
                .update({ status: 'active', activated_at: new Date().toISOString() })
                .eq('id', id)
            if (error) throw error
        } else {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[admin polls PATCH] error:', error)
        return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 })
    }
}

// DELETE — remove a question (and its options/votes via cascade).
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { id } = await params
        const supabase = getServiceClient()
        const { error } = await supabase.from('polls').delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[admin polls DELETE] error:', error)
        return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
    }
}
