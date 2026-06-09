import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { clientId } — toggle a like on a comment for this browser client.
// Returns { liked, likeCount }. like_count is maintained by a DB trigger.
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: commentId } = await params
        const { clientId } = await request.json()

        if (!commentId || !clientId || typeof clientId !== 'string') {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
        }

        // Is it already liked?
        const { data: existing } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('comment_id', commentId)
            .eq('client_id', clientId)
            .maybeSingle()

        let liked: boolean
        if (existing) {
            const { error } = await supabase
                .from('comment_likes')
                .delete()
                .eq('comment_id', commentId)
                .eq('client_id', clientId)
            if (error) {
                console.error('[comment like] delete error:', error)
                return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
            }
            liked = false
        } else {
            const { error } = await supabase
                .from('comment_likes')
                .insert([{ comment_id: commentId, client_id: clientId }])
            if (error) {
                console.error('[comment like] insert error:', error)
                return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
            }
            liked = true
        }

        // Read back the (trigger-maintained) count
        const { data: comment } = await supabase
            .from('comments')
            .select('like_count')
            .eq('id', commentId)
            .single()

        return NextResponse.json({ liked, likeCount: comment?.like_count ?? 0 })
    } catch (error) {
        console.error('[comment like] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
