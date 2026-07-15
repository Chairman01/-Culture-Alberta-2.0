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

/**
 * How many events to include in an article for a given city.
 *
 * Calgary/Edmonton get longer lists (up to 20): competing weekend guides in
 * these markets run 17-27 items and have trended longer year over year, and
 * longer lists mean more scroll depth and more in-content ad impressions.
 * Smaller cities stay at 12 — their feeds rarely support more, and padding
 * a thin list reads worse than a short one.
 */
const BIG_LIST_CITIES = new Set(['calgary', 'edmonton'])

export function targetEventCount(city: string, available: number): number {
  const cap = BIG_LIST_CITIES.has(city) ? 20 : 12
  return Math.min(available, cap)
}

/**
 * Rotating title adjective, Daily Hive-style ("27 awesome things to do...").
 * Deterministic by ISO week so re-runs for the same weekend produce the same
 * title, but consecutive weekends don't repeat.
 */
const TITLE_ADJECTIVES = ['awesome', 'outstanding', 'fantastic', 'superb', 'great']

export function weekendTitleAdjective(date: Date = new Date()): string {
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const week = Math.floor(date.getTime() / weekMs)
  return TITLE_ADJECTIVES[week % TITLE_ADJECTIVES.length]
}

function buildEventList(events: EventbriteEvent[]): string {
  return events
    .map((e, i) => {
      const lines = [
        `Event ${i + 1}:`,
        `  Title: ${e.title}`,
        `  Description: ${e.shortDescription || 'No description provided'}`,
        `  Date/Time: ${e.startFormatted}`,
        `  Venue: ${e.venueName}`,
        `  Address: ${e.venueAddress}`,
        `  Cost: ${e.price}`,
        `  URL: ${e.url}`,
        `  Category: ${e.categoryName}`,
      ]
      if (e.instagramUrl) lines.push(`  Instagram: ${e.instagramUrl}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

function buildPrompt(
  city: string,
  weekendLabel: string,
  events: EventbriteEvent[]
): string {
  const cityLabel = CITY_LABELS[city] || city
  const count = targetEventCount(city, events.length)
  const eventList = buildEventList(events.slice(0, count + 4)) // Feed a few extra, Claude picks the best

  return `You are writing a weekend events guide for culturealberta.com, a local Alberta news and culture site.

TASK: Write a weekend events guide for ${cityLabel} for the weekend of ${weekendLabel}.

VOICE AND STYLE:
- Straight-talking and locally knowledgeable, like a friend who actually goes to these things. Not hype-y.
- Never use: "amazing", "epic", "incredible", "fantastic", "exciting", "vibrant", "bustling", "hidden gem", "nestled", "there's something for everyone", "look no further", "whether you're X or Y", "get ready to", "grab your"
- Do not start two event descriptions the same way. Mix it up: some lead with the event, some with the venue, some with a practical tip, some with who it's for.
- Vary sentence length. Short sentences are fine. So are fragments, occasionally.
- Add one genuinely useful detail per event that the listing alone doesn't tell you (parking tip, crowd expectation, what to bring, what's new this year, etc.). If you don't have a real detail, say less rather than padding.
- Never write a summary sentence that restates the event name ("This event is a great way to..."). Get straight to what it is and why someone would go.
- Contractions are good. Rhetorical questions, exclamation marks, and "fun fact" asides are not.
- Never use an em dash (—) anywhere. Use a period, comma, or colon instead.
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
**Instagram:** [@handle](Instagram URL)   ← include this line ONLY if the event data has an Instagram field; derive @handle from the URL path

---

After all events, add this exact section:

### Editor's Pick
[EDITOR_PICK_PLACEHOLDER]

*Know an event we missed? Tag us [@culturealberta](https://instagram.com/culturealberta) or email hello@culturealberta.com.*

RULES:
- Do NOT include or promote music festivals, concerts, or any event centred on alcohol (bars, breweries, tastings, beer gardens), gambling or casinos, nightclubs or nightlife, or adults-only programming. If such an event appears in the data, skip it and use another. When describing an event that passes, never highlight drinking as part of the appeal.
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

function buildExcerpt(
  city: string,
  weekendLabel: string,
  count: number,
  events: EventbriteEvent[]
): string {
  const cityLabel = CITY_LABELS[city] || city
  // Lead with the two biggest names so the excerpt sells the article
  // instead of describing it. No em dashes.
  const [first, second] = events.map(e => e.title?.trim()).filter(Boolean)
  if (first && second) {
    return `${first}, ${second}, and more: here are ${count} things worth your time in ${cityLabel} this weekend, ${weekendLabel}.`
  }
  return `Still figuring out your plans for ${weekendLabel}? Here are ${count} things worth checking out in ${cityLabel} this weekend.`
}

// ---------------------------------------------------------------------------
// Weekly jobs article ("Who's Hiring in {City} This Week")
// ---------------------------------------------------------------------------

export interface JobsArticleJob {
  title: string
  company: string
  category: string
  salaryText: string | null
  employmentType: string | null
  snippet: string | null
  postingPath: string   // internal path, e.g. /jobs/posting/{slug}
  postedLabel: string | null
}

function buildJobsList(jobs: JobsArticleJob[]): string {
  return jobs
    .map((j, i) => {
      const lines = [
        `Job ${i + 1}:`,
        `  Title: ${j.title}`,
        `  Company: ${j.company}`,
        `  Category: ${j.category}`,
        `  Salary: ${j.salaryText || 'Not listed'}`,
        `  Type: ${j.employmentType || 'Not listed'}`,
        `  Posted: ${j.postedLabel || 'Recently'}`,
        `  Internal URL: ${j.postingPath}`,
        `  Summary: ${j.snippet || 'No summary provided'}`,
      ]
      return lines.join('\n')
    })
    .join('\n\n')
}

function buildJobsPrompt(cityLabel: string, weekLabel: string, jobs: JobsArticleJob[], citySlug: string): string {
  return `You are writing a weekly hiring roundup for culturealberta.com, a local Alberta news and culture site.

TASK: Write a "Who's Hiring in ${cityLabel} This Week" jobs roundup for the week of ${weekLabel}.

VOICE AND STYLE:
- Straight-talking and practical, like a friend passing along a lead. Not hype-y, not corporate.
- Never use: "amazing", "exciting", "incredible", "opportunity of a lifetime", "dream job", "look no further", "whether you're X or Y", "get ready to", "there's something for everyone"
- Vary sentence length. Short sentences are fine.
- For each job add one genuinely useful observation when the data supports it (pay relative to the field, whether the employer hires often, what the role likely involves). If you have nothing real to say, say less.
- Contractions are good. Rhetorical questions and exclamation marks are not.
- Never use an em dash (—) anywhere. Use a period, comma, or colon instead.
- Family-friendly, publishable as-is.

FORMAT — follow this exactly:

Start with ONE intro paragraph (3-4 sentences) about this week's ${cityLabel} job market based ONLY on the data below (how many openings, which sectors dominate, any salary standouts). No invented statistics.

Group the jobs by category. For each category:

### [Category Name]

Then for each job in that category:

**[Job Title](Internal URL)** at [Company]
[1-2 sentences: what the role is and the one useful observation. Mention the salary if listed.]

---

After the last job, STOP. Do not write a closing paragraph or sign-off — one is appended automatically.

RULES:
- Only include jobs from the list I provide. Do not invent jobs, companies, salaries, or details.
- Use the exact Internal URL from each job's data for its link. Never link anywhere else for a job.
- Salaries must match the data exactly. If salary says "Not listed", do not mention pay for that job.
- Do not include or promote any role centred on alcohol, gambling, cannabis, nightlife, or adults-only businesses (none should be in the data; skip any that slipped through).
- Include ALL ${jobs.length} jobs provided (unless one violates the rule above).

HERE ARE THE JOBS FOR ${cityLabel.toUpperCase()} (${weekLabel}):

${buildJobsList(jobs)}

Write the full article now.`
}

export async function generateJobsArticle(
  citySlug: string,
  cityLabel: string,
  weekLabel: string,
  jobs: JobsArticleJob[]
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var is not set')
  if (jobs.length === 0) throw new Error(`No jobs available for ${cityLabel} — skipping article generation`)

  const client = new Anthropic({ apiKey })

  console.log(`[article-generator] Generating jobs article for ${cityLabel} with ${jobs.length} jobs...`)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: buildJobsPrompt(cityLabel, weekLabel, jobs, citySlug) }],
  })

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  // Deterministic closing CTA — every roundup reliably points readers at the
  // jobs board to apply, independent of what the model writes.
  const closingCta = `
<hr>
<h3><a href="/jobs/${citySlug}">Apply to these jobs here</a></h3>
<p>Every opening above is on our <a href="/jobs/${citySlug}">${cityLabel} jobs board</a>, updated daily with new ${cityLabel} openings. <strong><a href="/auth/signup?next=/jobs/${citySlug}">Create a free account</a></strong> to apply, save jobs, and track every application in one place.</p>`

  const html = markdownToHtml(rawText)
    .replace(/\s+—\s+/g, ', ')
    .replace(/—/g, ', ')
    + closingCta

  const title = `Who's Hiring in ${cityLabel} This Week: ${jobs.length} New Jobs (${weekLabel})`

  const withSalary = jobs.filter(j => j.salaryText)
  const topCompanies = [...new Set(jobs.map(j => j.company))].slice(0, 2)
  const excerpt = topCompanies.length >= 2
    ? `${topCompanies[0]}, ${topCompanies[1]}, and more are hiring in ${cityLabel} this week. Here are ${jobs.length} new openings${withSalary.length > 0 ? ', with pay listed where employers shared it' : ''}.`
    : `${jobs.length} new job openings in ${cityLabel} this week, updated from employer listings.`

  console.log(`[article-generator] Jobs article generated: "${title}"`)

  return { title, content: html, excerpt }
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

  const count = targetEventCount(city, events.length)
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

  // Hard guarantee: no em dashes survive even if the model slips one in
  const html = markdownToHtml(rawText)
    .replace(/\s+—\s+/g, ', ')
    .replace(/—/g, ', ')

  const title = `${count} ${weekendTitleAdjective()} things to do in ${cityLabel} this weekend: ${weekendLabel}`
  const excerpt = buildExcerpt(city, weekendLabel, count, events)

  console.log(`[article-generator] Article generated: "${title}"`)

  return { title, content: html, excerpt }
}
