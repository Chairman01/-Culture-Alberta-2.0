import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { aggregatePollResults } from '@/lib/polls'

export const dynamic = 'force-dynamic'

// GET ?clientId=&articleId= — the poll for this context, with aggregated
// results. An article's own AI-generated poll wins; otherwise the site-wide
// daily question (article_id IS NULL). Optional Authorization bearer token
// unlocks the voter's own-city breakdown.
export async function GET(request: NextRequest) {
    try {
        const clientId = request.nextUrl.searchParams.get('clientId') || ''
        const articleId = request.nextUrl.searchParams.get('articleId') || ''

        let poll: { id: string; question: string; category: string; article_id?: string | null } | null = null

        if (articleId) {
            const { data } = await supabase
                .from('polls')
                .select('id, question, category, article_id')
                .eq('status', 'active')
                .eq('article_id', articleId)
                .maybeSingle()
            poll = data
        }

        if (!poll) {
            const { data, error: pollErr } = await supabase
                .from('polls')
                .select('id, question, category, article_id')
                .eq('status', 'active')
                .is('article_id', null)
                .order('activated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            if (pollErr) {
                console.error('[polls active GET] poll error:', pollErr)
                return NextResponse.json({ error: 'Failed to load poll' }, { status: 500 })
            }
            poll = data
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
            poll: {
                id: poll.id,
                question: poll.question,
                category: poll.category,
                scope: poll.article_id ? 'article' : 'daily',
            },
            ...results,
        })
    } catch (error) {
        console.error('[polls active GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
