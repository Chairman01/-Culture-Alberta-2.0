import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { pollId, optionId, clientId } — cast or change this browser's vote.
// Voting is open to everyone (no account) and deduped by client id, same as
// article likes. A valid Authorization bearer token records the voter's city
// (from user_metadata) so results can be split Edmonton vs Calgary.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const pollId: unknown = body?.pollId
        const optionId: unknown = body?.optionId
        const clientId: unknown = body?.clientId

        if (!pollId || typeof pollId !== 'string') {
            return NextResponse.json({ error: 'pollId is required' }, { status: 400 })
        }
        if (!optionId || typeof optionId !== 'string') {
            return NextResponse.json({ error: 'optionId is required' }, { status: 400 })
        }
        if (!clientId || typeof clientId !== 'string' || clientId.length > 100) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
        }

        const [{ data: poll }, { data: option }] = await Promise.all([
            supabase.from('polls').select('id, status').eq('id', pollId).maybeSingle(),
            supabase.from('poll_options').select('id, poll_id').eq('id', optionId).maybeSingle(),
        ])
        if (!poll || poll.status !== 'active') {
            return NextResponse.json({ error: 'Poll is not open for voting' }, { status: 409 })
        }
        if (!option || option.poll_id !== pollId) {
            return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
        }

        // City comes only from a verified token — never from the request body
        let city: string | null = null
        const authHeader = request.headers.get('authorization') || ''
        const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
        if (token) {
            const { data: userData } = await supabase.auth.getUser(token)
            const metaCity = (userData?.user?.user_metadata as { city?: string } | null)?.city
            if (metaCity && typeof metaCity === 'string') city = metaCity.slice(0, 40)
        }

        // Change-of-vote = delete + insert (avoids UPDATE RLS, same as likes)
        const { error: delErr } = await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('client_id', clientId)
        if (delErr) {
            console.error('[poll vote] delete error:', delErr)
            return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
        }

        const { error: insErr } = await supabase
            .from('poll_votes')
            .insert([{ poll_id: pollId, option_id: optionId, client_id: clientId, city }])
        if (insErr) {
            console.error('[poll vote] insert error:', insErr)
            return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[poll vote] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
