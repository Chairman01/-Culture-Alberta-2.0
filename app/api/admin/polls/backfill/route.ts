import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { generatePollForArticle } from '@/lib/poll-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// POST { limit? } — AI-write story polls for published articles that don't
// have one yet, newest first. Bounded per run (Claude call per article); call
// repeatedly until remaining is 0. Auth: admin session OR the automation cron
// secret (so backfills can be scripted).
function isCronAuthorized(req: NextRequest): boolean {
    const secret = process.env.AUTOMATION_CRON_SECRET
    if (!secret) return false
    return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
    if (!isCronAuthorized(request)) {
        const auth = requireAdmin(request)
        if (!auth.ok) return auth.response
    }

    try {
        let limit = 20
        try {
            const body = await request.json()
            if (typeof body?.limit === 'number') limit = Math.max(1, Math.min(40, Math.floor(body.limit)))
        } catch {
            /* empty body is fine */
        }

        const supabase = getServiceClient()

        const [{ data: articles, error: artErr }, { data: existingPolls, error: pollErr }] = await Promise.all([
            supabase
                .from('articles')
                .select('id, title, excerpt, content, category, created_at')
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(400),
            supabase.from('polls').select('article_id').not('article_id', 'is', null),
        ])
        if (artErr || pollErr) {
            console.error('[polls backfill] load error:', artErr || pollErr)
            return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 })
        }

        const covered = new Set((existingPolls || []).map(poll => poll.article_id))
        const pending = (articles || []).filter(article => !covered.has(article.id))
        const batch = pending.slice(0, limit)

        let created = 0
        let unsuitable = 0
        let errors = 0
        for (const article of batch) {
            const result = await generatePollForArticle(article)
            if (result === 'created') created += 1
            else if (result === 'unsuitable') unsuitable += 1
            else if (result === 'error') errors += 1
            else if (result === 'no-key') {
                return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 })
            }
        }

        return NextResponse.json({
            processed: batch.length,
            created,
            skippedAsSensitive: unsuitable,
            errors,
            remaining: pending.length - batch.length,
        })
    } catch (error) {
        console.error('[polls backfill] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
