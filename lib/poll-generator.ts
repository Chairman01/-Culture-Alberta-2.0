import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from '@/lib/supabase-admin'

/**
 * Generates an article-specific poll with Claude when an article is published.
 *
 * Safety model:
 *  - The model first judges tone; tragedy/sombre stories get NO poll (and the
 *    article page's own sombre filter is a second, independent gate).
 *  - Questions must follow the site's content rules (no alcohol, gambling,
 *    nightlife, or festival/concert promotion).
 *  - Fire-and-forget from the publish path: a generation failure never blocks
 *    publishing, and the site-wide daily question remains the fallback.
 */

interface ArticleForPoll {
    id: string
    title: string
    excerpt?: string | null
    content?: string | null
    category?: string | null
}

interface GeneratedPoll {
    suitable: boolean
    question?: string
    options?: string[]
}

export async function generatePollForArticle(article: ArticleForPoll): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        console.warn('[poll-generator] ANTHROPIC_API_KEY missing — skipping article poll')
        return
    }

    const supabase = getServiceClient()

    // One poll per article — re-publishing must not create duplicates
    const { data: existing } = await supabase
        .from('polls')
        .select('id')
        .eq('article_id', article.id)
        .maybeSingle()
    if (existing) return

    const plain = String(article.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2500)

    const prompt = `You write one-tap reader polls for Culture Alberta, a local Alberta news and culture site. Read this article and decide whether a poll is appropriate, and if so, write one.

Title: ${article.title}
Category: ${article.category || ''}
Excerpt: ${article.excerpt || ''}
Body: ${plain}

Rules, in order:
1. If the story involves death, serious injury, missing persons, crime with victims, addiction, overdoses, layoffs, disasters, or any human suffering: the article gets NO poll. Return {"suitable": false}.
2. Never write a question that promotes alcohol, bars, nightlife, gambling, casinos, or music festivals/concerts.
3. Otherwise write ONE engaging question a local reader can answer in one tap, directly about this story's topic. Make it fun or opinionated where the story is light, and a fair civic-opinion question where the story is serious-but-not-tragic policy news (e.g. "Is this a good use of city money?").
4. 2 to 4 short options (max 60 chars each). Options must be balanced — never push one viewpoint. A final playful option is welcome on light stories.
5. The question must make sense to someone who just finished this exact article.
6. The site's goal is conversation: prefer questions with a defensible "hot take" quality — ones readers will want to justify out loud. Where it fits naturally, make the last option an invitation like "Depends — I'll explain in the comments".

Return ONLY JSON, nothing else:
{"suitable": true, "question": "...", "options": ["...", "..."]}
or {"suitable": false}`

    try {
        const client = new Anthropic({ apiKey })
        const message = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
        })

        const raw = message.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('')
            .trim()

        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) return
        let parsed: GeneratedPoll
        try {
            parsed = JSON.parse(match[0])
        } catch {
            return
        }

        if (!parsed.suitable || !parsed.question || !Array.isArray(parsed.options)) return
        const options = parsed.options
            .map((o) => String(o).trim())
            .filter(Boolean)
            .slice(0, 4)
        if (options.length < 2) return

        const { data: poll, error: pollErr } = await supabase
            .from('polls')
            .insert([{
                question: String(parsed.question).slice(0, 200),
                category: article.category?.toLowerCase() || 'general',
                status: 'active',
                article_id: article.id,
                activated_at: new Date().toISOString(),
            }])
            .select('id')
            .single()
        if (pollErr || !poll) {
            console.error('[poll-generator] insert error:', pollErr)
            return
        }

        const { error: optErr } = await supabase
            .from('poll_options')
            .insert(options.map((label, index) => ({ poll_id: poll.id, label: label.slice(0, 120), sort: index })))
        if (optErr) {
            console.error('[poll-generator] options error:', optErr)
            await supabase.from('polls').delete().eq('id', poll.id)
            return
        }

        console.log(`[poll-generator] created poll for "${article.title}": ${parsed.question}`)
    } catch (err) {
        console.error('[poll-generator] generation failed (non-fatal):', err)
    }
}
