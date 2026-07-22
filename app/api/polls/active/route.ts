import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { aggregatePollResults } from '@/lib/polls'

export const dynamic = 'force-dynamic'

// GET ?clientId= — the current active poll with aggregated results.
// Optional Authorization: Bearer <supabase access token> unlocks the voter's
// own-city breakdown (the "sign in to see your city's split" upsell).
export async function GET(request: NextRequest) {
    try {
        const clientId = request.nextUrl.searchParams.get('clientId') || ''

        const { data: poll, error: pollErr } = await supabase
            .from('polls')
            .select('id, question, category, activated_at')
            .eq('status', 'active')
            .order('activated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (pollErr) {
            console.error('[polls active GET] poll error:', pollErr)
            return NextResponse.json({ error: 'Failed to load poll' }, { status: 500 })
        }
        if (!poll) return NextResponse.json({ poll: null })

        const [{ data: options, error: optErr }, { data: votes, error: voteErr }] = await Promise.all([
            supabase.from('poll_options').select('id, label, sort').eq('poll_id', poll.id).order('sort'),
            supabase.from('poll_votes').select('option_id, city, client_id').eq('poll_id', poll.id),
        ])
        if (optErr || voteErr || !options) {
            console.error('[polls active GET] load error:', optErr || voteErr)
            return NextResponse.json({ error: 'Failed to load poll' }, { status: 500 })
        }

        // Signed-in voters get their own city's full breakdown
        let myCity: string | null = null
        const authHeader = request.headers.get('authorization') || ''
        const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
        if (token) {
            const { data: userData } = await supabase.auth.getUser(token)
            const metaCity = (userData?.user?.user_metadata as { city?: string } | null)?.city
            if (metaCity && typeof metaCity === 'string') myCity = metaCity
        }

        const results = aggregatePollResults(options, votes || [], clientId, myCity)

        return NextResponse.json({
            poll: { id: poll.id, question: poll.question, category: poll.category },
            ...results,
        })
    } catch (error) {
        console.error('[polls active GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
