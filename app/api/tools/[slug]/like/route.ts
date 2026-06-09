import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET ?clientId= — return { count, liked } for a tool
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const clientId = request.nextUrl.searchParams.get('clientId') || ''

        const { count, error } = await supabase
            .from('tool_likes')
            .select('*', { count: 'exact', head: true })
            .eq('tool_slug', slug)
        if (error) {
            console.error('[tool like GET] count error:', error)
            return NextResponse.json({ error: 'Failed to load likes' }, { status: 500 })
        }

        let liked = false
        if (clientId) {
            const { data } = await supabase
                .from('tool_likes')
                .select('client_id')
                .eq('tool_slug', slug)
                .eq('client_id', clientId)
                .maybeSingle()
            liked = !!data
        }

        return NextResponse.json({ count: count || 0, liked })
    } catch (error) {
        console.error('[tool like GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST { clientId } — toggle a tool like for this browser client
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const { clientId } = await request.json()

        if (!clientId || typeof clientId !== 'string') {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
        }

        const { data: existing } = await supabase
            .from('tool_likes')
            .select('client_id')
            .eq('tool_slug', slug)
            .eq('client_id', clientId)
            .maybeSingle()

        let liked: boolean
        if (existing) {
            const { error } = await supabase
                .from('tool_likes')
                .delete()
                .eq('tool_slug', slug)
                .eq('client_id', clientId)
            if (error) {
                console.error('[tool like] delete error:', error)
                return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
            }
            liked = false
        } else {
            const { error } = await supabase
                .from('tool_likes')
                .insert([{ tool_slug: slug, client_id: clientId }])
            if (error) {
                console.error('[tool like] insert error:', error)
                return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
            }
            liked = true
        }

        const { count } = await supabase
            .from('tool_likes')
            .select('*', { count: 'exact', head: true })
            .eq('tool_slug', slug)

        return NextResponse.json({ liked, count: count || 0 })
    } catch (error) {
        console.error('[tool like] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
