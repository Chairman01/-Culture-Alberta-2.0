import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrContributor } from '@/lib/admin-auth'
import { suggestPollForArticle } from '@/lib/poll-generator'

export const dynamic = 'force-dynamic'

// POST { title, content?, excerpt?, category? } — AI-drafts a poll for the
// editor's "Suggest poll" button. Nothing is saved; the editor decides.
export async function POST(request: NextRequest) {
    const auth = requireAdminOrContributor(request)
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const title = typeof body?.title === 'string' ? body.title.trim() : ''
        if (!title && !body?.content) {
            return NextResponse.json({ error: 'A title or some content is required.' }, { status: 400 })
        }

        const suggestion = await suggestPollForArticle({
            title,
            content: typeof body?.content === 'string' ? body.content : '',
            excerpt: typeof body?.excerpt === 'string' ? body.excerpt : '',
            category: typeof body?.category === 'string' ? body.category : '',
        })

        if (suggestion === null) {
            return NextResponse.json({ error: 'Poll suggestion is unavailable right now.' }, { status: 503 })
        }
        if ('unsuitable' in suggestion) {
            return NextResponse.json({ error: 'AI judged this story too sensitive for a poll.' }, { status: 422 })
        }
        return NextResponse.json(suggestion)
    } catch (error) {
        console.error('[polls suggest] error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
