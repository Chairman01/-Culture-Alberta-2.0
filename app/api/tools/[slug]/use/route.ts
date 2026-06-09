import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { clientId } — record one tool usage event.
// The client only calls this once per session (it gates the call locally),
// so each row represents an actual interaction. Distinct client_id = users.
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const { clientId } = await request.json().catch(() => ({ clientId: null }))

        const { error } = await supabase
            .from('tool_usage')
            .insert([{ tool_slug: slug, client_id: clientId || null }])

        if (error) {
            console.error('[tool use] insert error:', error)
            return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[tool use] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
