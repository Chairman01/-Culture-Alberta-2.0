import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: the whole question bank with vote counts, newest first within status.
export async function GET(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const supabase = getServiceClient()
        const [{ data: polls, error: pollErr }, { data: options, error: optErr }, { data: votes, error: voteErr }] =
            await Promise.all([
                supabase.from('polls').select('*').order('sort_order').order('created_at'),
                supabase.from('poll_options').select('id, poll_id, label, sort').order('sort'),
                supabase.from('poll_votes').select('poll_id, option_id, city'),
            ])
        if (pollErr || optErr || voteErr) {
            console.error('[admin polls GET] error:', pollErr || optErr || voteErr)
            return NextResponse.json({ error: 'Failed to load polls' }, { status: 500 })
        }

        const voteCounts = new Map<string, number>()
        const pollTotals = new Map<string, number>()
        for (const vote of votes || []) {
            voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) || 0) + 1)
            pollTotals.set(vote.poll_id, (pollTotals.get(vote.poll_id) || 0) + 1)
        }

        const shaped = (polls || []).map(poll => ({
            ...poll,
            totalVotes: pollTotals.get(poll.id) || 0,
            options: (options || [])
                .filter(option => option.poll_id === poll.id)
                .map(option => ({ id: option.id, label: option.label, votes: voteCounts.get(option.id) || 0 })),
        }))

        return NextResponse.json({ polls: shaped })
    } catch (error) {
        console.error('[admin polls GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST { question, category, options: string[], status? } — add to the bank.
export async function POST(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const question = typeof body?.question === 'string' ? body.question.trim() : ''
        const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim() : 'general'
        const status = body?.status === 'approved' ? 'approved' : 'draft'
        const optionLabels: string[] = Array.isArray(body?.options)
            ? body.options.map((o: unknown) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
            : []

        if (!question || question.length > 200) {
            return NextResponse.json({ error: 'Question is required (max 200 chars)' }, { status: 400 })
        }
        if (optionLabels.length < 2 || optionLabels.length > 5) {
            return NextResponse.json({ error: 'Provide 2-5 options' }, { status: 400 })
        }

        const supabase = getServiceClient()
        const { data: poll, error: pollErr } = await supabase
            .from('polls')
            .insert([{ question, category, status }])
            .select('id')
            .single()
        if (pollErr || !poll) {
            console.error('[admin polls POST] insert error:', pollErr)
            return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
        }

        const { error: optErr } = await supabase
            .from('poll_options')
            .insert(optionLabels.map((label, index) => ({ poll_id: poll.id, label: label.slice(0, 120), sort: index })))
        if (optErr) {
            console.error('[admin polls POST] options error:', optErr)
            await supabase.from('polls').delete().eq('id', poll.id)
            return NextResponse.json({ error: 'Failed to create poll options' }, { status: 500 })
        }

        return NextResponse.json({ ok: true, id: poll.id })
    } catch (error) {
        console.error('[admin polls POST] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
