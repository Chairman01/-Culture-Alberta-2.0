/**
 * Claude-powered article generator for weekend events.
 * Uses the Anthropic SDK to write articles in Culture Alberta's voice.
 *
 * Requires env var: ANTHROPIC_API_KEY
 * Get yours at: console.anthropic.com
 */

import Anthropic from '@anthropic-ai/sdk'
import type { EventbriteEvent } from './eventbrite'

const CITY_LABELS: Record<string, string> = {
  calgary:          'Calgary',
  edmonton:         'Edmonton',
  lethbridge:       'Lethbridge',
  'medicine-hat':   'Medicine Hat',
  'grande-prairie': 'Grande Prairie',
  'fort-mcmurray':  'Fort McMurray',
}

function buildEventList(events: EventbriteEvent[]): string {
  return events
    .map((e, i) => {
      return [
        `Event ${i + 1}:`,
        `  Title: ${e.title}`,
        `  Description: ${e.shortDescription || 'No description provided'}`,
        `  Date/Time: ${e.startFormatted}`,
        `  Venue: ${e.venueName}`,
        `  Address: ${e.venueAddress}`,
        `  Cost: ${e.price}`,
        `  URL: ${e.url}`,
        `  Category: ${e.categoryName}`,
      ].join('\n')
    })
    .join('\n\n')
}

function buildPrompt(
  city: string,
  weekendLabel: string,
  events: EventbriteEvent[]
): string {
  const cityLabel = CITY_LABELS[city] || city
  const count = Math.min(events.length, 12)
  const eventList = buildEventList(events.slice(0, 14)) // Feed up to 14, Claude picks best 12

  return `You are writing a weekend events guide for culturealberta.com, a local Alberta news and culture site.

TASK: Write a weekend events guide for ${cityLabel} for the weekend of ${weekendLabel}.

VOICE AND STYLE:
- Straight-talking and locally knowledgeable. Not hype-y.
- Never use: "amazing", "epic", "incredible", "fantastic", "exciting", "vibrant", "there's something for everyone"
- Add one genuinely useful detail per event that the listing alone doesn't tell you (parking tip, crowd expectation, what to bring, what's new this year, etc.)
- The article is family-friendly and appropriate for a general audience

FORMAT — follow this exactly:

Start with ONE intro paragraph (3-4 sentences). Include [LOCAL_ANGLE] on a line by itself to mark where I will insert a current local detail. Do not write the local detail yourself.

Then list ${count} events using this format for each:

### [Event Name](event URL)
**[Category tag — one of: Festival / Market / Music / Sports / Arts / Outdoors / Community / Free]**

[2-3 sentence description. Include one useful local detail.]

**When:** [day, date, time]
**Where:** [venue name, address]
**Cost:** [price or Free]

---

After all events, add this exact section:

### Editor's Pick
[EDITOR_PICK_PLACEHOLDER]

*Know an event we missed? Tag us [@culturealberta](https://instagram.com/culturealberta) or email hello@culturealberta.com.*

RULES:
- Only include events from the list I provide
- Do not invent events, venues, dates, or prices
- If an event description is thin, acknowledge it briefly and link to the full details
- Use the exact URL from the listing for each event link
- Dates must match exactly what's in the data
- The article must be clean, family-friendly, and publishable as-is

HERE ARE THE EVENTS FOR ${cityLabel.toUpperCase()} THIS WEEKEND (${weekendLabel}):

${eventList}

Write the full article now.`
}

export interface GeneratedArticle {
  title: string
  content: string   // Full HTML (converted from markdown)
  excerpt: string
}

/**
 * Converts the markdown from Claude into basic HTML suitable for TipTap/the CMS.
 */
function markdownToHtml(md: string): string {
  return md
    // H3 headings with links e.g. ### [Event Name](url)
    .replace(/^### \[(.+?)\]\((.+?)\)/gm, '<h3><a href="$2" target="_blank" rel="noopener noreferrer">$1</a></h3>')
    // H3 headings without links
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold + content on same line: **Label:** text
    .replace(/\*\*(.+?):\*\* (.+)/g, '<p><strong>$1:</strong> $2</p>')
    // Bold text inline
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic links: [@handle](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Line breaks → paragraphs (simple version)
    .split('\n\n')
    .map(block => {
      block = block.trim()
      if (!block) return ''
      if (block.startsWith('<h') || block.startsWith('<hr') || block.startsWith('<p')) return block
      return `<p>${block.replace(/\n/g, '<br>')}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

function buildExcerpt(city: string, weekendLabel: string, count: number): string {
  const cityLabel = CITY_LABELS[city] || city
  return `${count} things to do in ${cityLabel} this weekend (${weekendLabel}), from outdoor festivals and markets to live music and community events.`
}

export async function generateWeekendEventsArticle(
  city: string,
  weekendLabel: string,
  events: EventbriteEvent[]
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var is not set')

  if (events.length === 0) {
    throw new Error(`No events available for ${city} this weekend — skipping article generation`)
  }

  const count = Math.min(events.length, 12)
  const cityLabel = CITY_LABELS[city] || city

  const client = new Anthropic({ apiKey })

  console.log(`[article-generator] Generating article for ${cityLabel} with ${events.length} events...`)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: buildPrompt(city, weekendLabel, events),
      },
    ],
  })

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  const html = markdownToHtml(rawText)

  const title = `${count} Things to Do in ${cityLabel} This Weekend (${weekendLabel})`
  const excerpt = buildExcerpt(city, weekendLabel, count)

  console.log(`[article-generator] Article generated: "${title}"`)

  return { title, content: html, excerpt }
}
