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

export type PollGenerationResult = 'created' | 'exists' | 'unsuitable' | 'error' | 'no-key'

/**
 * Saves a hand-written poll for an article (from the article editor),
 * replacing any existing poll for it. Manual always beats AI.
 */
export async function saveManualPollForArticle(
    articleId: string,
    question: string,
    optionLabels: string[]
): Promise<boolean> {
    const cleanQuestion = String(question || '').trim().slice(0, 200)
    const cleanOptions = (optionLabels || [])
        .map(label => String(label || '').trim())
        .filter(Boolean)
        .slice(0, 4)
    if (!cleanQuestion || cleanOptions.length < 2) return false

    const supabase = getServiceClient()
    await supabase.from('polls').delete().eq('article_id', articleId)

    const { data: poll, error: pollErr } = await supabase
        .from('polls')
        .insert([{
            question: cleanQuestion,
            category: 'general',
            status: 'active',
            article_id: articleId,
            activated_at: new Date().toISOString(),
        }])
        .select('id')
        .single()
    if (pollErr || !poll) {
        console.error('[poll-generator] manual poll insert error:', pollErr)
        return false
    }

    const { error: optErr } = await supabase
        .from('poll_options')
        .insert(cleanOptions.map((label, index) => ({ poll_id: poll.id, label: label.slice(0, 120), sort: index })))
    if (optErr) {
        console.error('[poll-generator] manual poll options error:', optErr)
        await supabase.from('polls').delete().eq('id', poll.id)
        return false
    }
    return true
}

export async function generatePollForArticle(article: ArticleForPoll): Promise<PollGenerationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        console.warn('[poll-generator] ANTHROPIC_API_KEY missing — skipping article poll')
        return 'no-key'
    }

    const supabase = getServiceClient()

    // One poll per article — re-publishing must not create duplicates
    const { data: existing } = await supabase
        .from('polls')
        .select('id')
        .eq('article_id', article.id)
        .maybeSingle()
    if (existing) return 'exists'

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
1. If the story involves a death, obituary, serious injury, missing person, crime with identifiable victims, or an active emergency: the article gets NO poll. Return {"suitable": false}. This is absolute.
2. If the story is serious POLICY or POLITICAL news (government funding or spending, new laws or rules, elections, city council decisions — including on heavy topics like addiction services, housing, or homelessness): write a sober, respectful civic-opinion question about the DECISION (e.g. "Is this the right use of the money?"). No playful tone, no jokes in the options, and never a question about the people affected — only about the policy.
3. Never write a question that promotes alcohol, bars, nightlife, gambling, casinos, or music festivals/concerts.
4. Otherwise write ONE engaging question a local reader can answer in one tap, directly about this story's topic. Make it fun or opinionated where the story is light.
5. 2 to 4 options, each SHORT and punchy — 2 to 6 words, max 40 characters. Sound like a local talking, not a survey. Never use the formulaic "one side / other side / not sure" template, and never include a "not sure", "no opinion", or "undecided" option. Options must still be balanced — never push one viewpoint. A playful option is welcome on light stories only.
6. The question must make sense to someone who just finished this exact article.
7. The site's goal is conversation: prefer questions readers will want to justify out loud. Every option must be a real answer with substance — NEVER meta options like "I'll explain in the comments", "tell us below", or "other". The site handles the comments invitation separately.

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
        if (!match) return 'error'
        let parsed: GeneratedPoll
        try {
            parsed = JSON.parse(match[0])
        } catch {
            return 'error'
        }

        const markUnsuitable = async (): Promise<'unsuitable'> => {
            // Persist the judgment so backfills never re-bill the same article
            await supabase.from('polls').insert([{
                question: 'No poll — story judged too sensitive',
                category: 'general',
                status: 'skipped',
                article_id: article.id,
            }])
            return 'unsuitable'
        }

        if (!parsed.suitable || !parsed.question || !Array.isArray(parsed.options)) return markUnsuitable()
        const options = parsed.options
            .map((o) => String(o).trim())
            .filter(Boolean)
            .slice(0, 4)
        if (options.length < 2) return markUnsuitable()

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
            return 'error'
        }

        const { error: optErr } = await supabase
            .from('poll_options')
            .insert(options.map((label, index) => ({ poll_id: poll.id, label: label.slice(0, 120), sort: index })))
        if (optErr) {
            console.error('[poll-generator] options error:', optErr)
            await supabase.from('polls').delete().eq('id', poll.id)
            return 'error'
        }

        console.log(`[poll-generator] created poll for "${article.title}": ${parsed.question}`)
        return 'created'
    } catch (err) {
        console.error('[poll-generator] generation failed (non-fatal):', err)
        return 'error'
    }
}
