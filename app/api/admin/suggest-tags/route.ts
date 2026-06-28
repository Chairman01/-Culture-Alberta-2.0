import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdminOrContributor } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST: suggest 5 SEO tags for an article using Claude (admin/contributor only).
export async function POST(request: NextRequest) {
    const auth = requireAdminOrContributor(request)
    if (!auth.ok) return auth.response

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return NextResponse.json({ error: 'AI tagging is not configured (ANTHROPIC_API_KEY missing).' }, { status: 503 })
    }

    try {
        const { title, content, category, location } = await request.json()
        if (!title && !content) {
            return NextResponse.json({ error: 'A title or some content is required to suggest tags.' }, { status: 400 })
        }

        const plain = String(content || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000)

        const prompt = `You are tagging a local Alberta news / culture article for SEO and content recommendations.

Title: ${title || ''}
Category: ${category || ''}
Location: ${location || ''}
Body: ${plain}

Suggest exactly 5 short, specific tags (1-3 words each, lowercase, no "#"). Favour concrete entities — places, people, organizations, and topics — over generic filler words. Return ONLY a JSON array of 5 strings, nothing else.`

        const client = new Anthropic({ apiKey })
        const message = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }],
        })

        const raw = message.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('')
            .trim()

        let tags: string[] = []
        const match = raw.match(/\[[\s\S]*\]/)
        if (match) {
            try {
                tags = JSON.parse(match[0])
            } catch {
                /* fall through to empty */
            }
        }
        tags = (Array.isArray(tags) ? tags : [])
            .map((t) => String(t).trim().toLowerCase())
            .filter(Boolean)
            .filter((t, i, a) => a.indexOf(t) === i)
            .slice(0, 5)

        return NextResponse.json({ tags })
    } catch (e) {
        console.error('[suggest-tags] error:', e)
        return NextResponse.json({ error: 'Could not suggest tags. Please try again.' }, { status: 500 })
    }
}
