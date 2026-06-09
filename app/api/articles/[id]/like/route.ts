import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET ?clientId= — return { count, vote } for an article
// count = number of up-votes (thumbs up). vote = this client's vote: 1 | -1 | 0
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: articleId } = await params
        const clientId = request.nextUrl.searchParams.get('clientId') || ''

        const { count, error } = await supabase
            .from('article_likes')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId)
            .eq('value', 1)
        if (error) {
            console.error('[article like GET] count error:', error)
            return NextResponse.json({ error: 'Failed to load likes' }, { status: 500 })
        }

        let vote = 0
        if (clientId) {
            const { data } = await supabase
                .from('article_likes')
                .select('value')
                .eq('article_id', articleId)
                .eq('client_id', clientId)
                .maybeSingle()
            vote = data?.value ?? 0
        }

        return NextResponse.json({ count: count || 0, vote })
    } catch (error) {
        console.error('[article like GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST { clientId, vote } — set this browser's vote (1 = up, -1 = down).
// Clicking the same direction again clears the vote (toggle off, YouTube-style).
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: articleId } = await params
        const body = await request.json()
        const clientId: unknown = body?.clientId
        const requested: unknown = body?.vote

        if (!clientId || typeof clientId !== 'string') {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
        }
        if (requested !== 1 && requested !== -1) {
            return NextResponse.json({ error: 'vote must be 1 or -1' }, { status: 400 })
        }

        const { data: existing } = await supabase
            .from('article_likes')
            .select('value')
            .eq('article_id', articleId)
            .eq('client_id', clientId)
            .maybeSingle()

        // Clear any existing row first (delete + insert avoids needing UPDATE RLS).
        if (existing) {
            const { error } = await supabase
                .from('article_likes')
                .delete()
                .eq('article_id', articleId)
                .eq('client_id', clientId)
            if (error) {
                console.error('[article like] delete error:', error)
                return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
            }
        }

        let vote: number
        if (existing && existing.value === requested) {
            // Same direction → leave it cleared (toggle off)
            vote = 0
        } else {
            // New vote or switching direction → insert the fresh row
            const { error } = await supabase
                .from('article_likes')
                .insert([{ article_id: articleId, client_id: clientId, value: requested }])
            if (error) {
                console.error('[article like] insert error:', error)
                return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
            }
            vote = requested
        }

        const { count } = await supabase
            .from('article_likes')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId)
            .eq('value', 1)

        return NextResponse.json({ vote, count: count || 0 })
    } catch (error) {
        console.error('[article like] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
