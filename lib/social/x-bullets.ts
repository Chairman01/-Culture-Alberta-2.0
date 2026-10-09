import Anthropic from '@anthropic-ai/sdk'
import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Point-form summaries for X.
//
// The branded card already carries the headline, so the post text is three
// short facts from the story. Claude writes them from the article body; if
// Claude is unavailable, declines, or returns something unusable, the bullets
// are cut from the excerpt instead, so a post never waits on the model.
//
// X counts some characters (emoji, CJK) as two and caps posts at 280, and the
// link post adds a 23-character link, so the bullets are held well under that.
// ---------------------------------------------------------------------------

const MAX_BULLET = 80
const MAX_TOTAL = 225
const BODY_CHARS = 8_000

const SCHEMA = {
  type: 'object',
  properties: {
    bullets: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly three bullet points',
    },
  },
  required: ['bullets'],
  additionalProperties: false,
}

const SYSTEM = `You write the text of X (Twitter) posts for Culture Alberta, a local news site in Alberta, Canada.
Each post shows an image card that already displays the headline. Your job is three bullet points that give a reader the key facts at a glance.

Rules:
- Exactly three bullets, each under ${MAX_BULLET - 10} characters, all three together under ${MAX_TOTAL - 20} characters.
- Plain facts from the article only: who, what, where, when, numbers, what happens next. Never invent anything.
- Do not repeat the headline word for word.
- No hashtags, no emoji, no exclamation marks, no clickbait, no questions to the reader.
- Canadian spelling. Sentence fragments are fine.
- For crime, tragedy or court stories, stay neutral and factual, and never name a minor.`

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Shorten to `max` characters, breaking at a word rather than mid-word. */
const clip = (s: string, max: number) => {
  const chars = [...s.trim()]
  if (chars.length <= max) return chars.join('')
  const cut = chars.slice(0, max - 1).join('')
  const atWord = cut.replace(/\s+\S*$/, '')
  return (atWord.length > max * 0.6 ? atWord : cut).replace(/[\s,;:–-]+$/, '') + '…'
}

// Excerpts often end with a teaser for the article ("See what the score
// means…"). That's a call to click, not a fact, so it never becomes a bullet.
const TEASER = /^(see|here'?s|find out|read|learn|discover|check out|what you need to know)\b/i

/** Keep bullets inside the length budget whatever the source. */
function tidy(bullets: string[]): string[] {
  const out: string[] = []
  let total = 0
  for (const raw of bullets) {
    const b = clip(raw.replace(/^[\s•\-–*]+/, '').replace(/\s+/g, ' '), MAX_BULLET)
    if (!b) continue
    if (total + [...b].length > MAX_TOTAL) break
    out.push(b)
    total += [...b].length
    if (out.length === 3) break
  }
  return out
}

/** The fallback: the excerpt's first sentences, or the title. */
export function bulletsFromExcerpt(article: SocialArticle): string[] {
  const text = (article.excerpt ?? '').trim()
  const sentences = (text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? (text ? [text] : [])).filter(
    (s) => !TEASER.test(s)
  )
  const bullets = tidy(sentences.map((s) => s.replace(/[.]$/, '')))
  return bullets.length > 0 ? bullets : tidy([article.title])
}

export interface BulletResult {
  bullets: string[]
  source: 'claude' | 'excerpt'
  note?: string
}

export async function writeXBullets(article: SocialArticle, bodyHtml?: string | null): Promise<BulletResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { bullets: bulletsFromExcerpt(article), source: 'excerpt', note: 'ANTHROPIC_API_KEY not set' }
  }

  const body = clip(stripHtml(bodyHtml ?? ''), BODY_CHARS)

  try {
    const client = new Anthropic({ timeout: 45_000, maxRetries: 1 })
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // A short summary needs little deliberation; low effort keeps it quick.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Headline: ${article.title}\nCity: ${article.category ?? 'Alberta'}\nSummary: ${article.excerpt ?? ''}\n\nArticle:\n${body || '(no body text)'}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return { bullets: bulletsFromExcerpt(article), source: 'excerpt', note: 'Claude declined' }
    }

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text) as { bullets?: unknown }
    const bullets = Array.isArray(parsed.bullets) ? tidy(parsed.bullets.map(String)) : []
    if (bullets.length >= 2) return { bullets, source: 'claude' }

    return { bullets: bulletsFromExcerpt(article), source: 'excerpt', note: 'Claude returned too few bullets' }
  } catch (err) {
    const note =
      err instanceof Anthropic.APIError ? `Claude API ${err.status}: ${err.message}` : `Claude failed: ${String(err)}`
    console.warn('[x bullets] falling back to the excerpt —', note)
    return { bullets: bulletsFromExcerpt(article), source: 'excerpt', note: note.slice(0, 200) }
  }
}
