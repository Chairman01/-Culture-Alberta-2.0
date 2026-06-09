import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { helpful, note?, clientId? } — record anonymous tool feedback.
// Notes are private (no public SELECT policy); admin reads via service role.
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const { helpful, note, clientId } = await request.json()

        if (typeof helpful !== 'boolean') {
            return NextResponse.json({ error: 'helpful (boolean) is required' }, { status: 400 })
        }

        const cleanNote =
            typeof note === 'string' && note.trim()
                ? note.replace(/<[^>]*>/g, '').trim().substring(0, 1000)
                : null

        const { error } = await supabase.from('tool_feedback').insert([
            {
                tool_slug: slug,
                helpful,
                note: cleanNote,
                client_id: typeof clientId === 'string' ? clientId : null,
            },
        ])

        if (error) {
            console.error('[tool feedback] insert error:', error)
            return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[tool feedback] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
