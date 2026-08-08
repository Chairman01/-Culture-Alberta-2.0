/**
 * Attributes read out of a job description rather than a feed field.
 *
 * The ATS APIs are thin here: Greenhouse returns no employment type at all, and
 * none of them expose union status. But several employers state both in plain
 * text inside the description, in a consistent structured form — Enbridge prints
 * "Union/Non: This is a non-union position", ENMAX prints "Union: Exempt —
 * Management Professional (MP)".
 *
 * Everything below reads explicit statements only. A first pass at this matched
 * the word "union" anywhere in the text and would have labelled 17 jobs as union
 * work when every single one of them said *non*-union. Filters that confidently
 * return the wrong jobs are worse than no filter, so anything unstated stays
 * 'unknown' and is simply not offered as a filter option.
 */

export type UnionStatus = 'union' | 'non-union' | 'unknown'

/** Strip tags and collapse whitespace so patterns can span original markup. */
function toText(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
}

// Checked before the positive patterns: "non-union" contains "union", and
// "excluded from the bargaining unit" contains "bargaining unit".
const NON_UNION = [
  /\bnon[-\s]?union\b/i,
  /\bunion\s*\/?\s*non\s*:?\s*(this is a )?non/i,
  /\bunion\s*:\s*exempt\b/i,
  /\bexcluded from the bargaining unit\b/i,
  /\bnot (?:part of|covered by|represented by) (?:a |the )?(?:union|bargaining unit|collective agreement)\b/i,
]

const UNION = [
  /\bthis is a union position\b/i,
  /\bunion\s*\/?\s*non\s*:?\s*(this is a )?union\b/i,
  /\b(?:covered by|subject to|governed by) (?:a |the )?collective (?:agreement|bargaining agreement)\b/i,
  /\bmember of (?:a |the )?bargaining unit\b/i,
  // Alberta locals, named explicitly
  /\b(AUPE|UNA|HSAA|CUPE|IBEW|USW|Teamsters|CSU\s*52|ATU|UFCW|PSAC|Unifor)\b/,
]

export function detectUnionStatus(descriptionHtml: string | null | undefined): UnionStatus {
  const text = toText(descriptionHtml)
  if (!text) return 'unknown'
  if (NON_UNION.some(p => p.test(text))) return 'non-union'
  if (UNION.some(p => p.test(text))) return 'union'
  return 'unknown'
}

/**
 * Fill in employment type when the feed didn't supply one.
 *
 * Only structured, labelled statements count. Loose prose matching produces
 * nonsense — "full-time equivalent" and "supporting part-time students" both
 * appear in descriptions of permanent salaried roles.
 */
const EMPLOYMENT_PATTERNS: Array<[RegExp, string]> = [
  [/\btemporary\s*\(fixed[-\s]?term\)/i, 'TEMPORARY'],
  [/\b(?:employment|position|job|worker)\s*type\s*:?\s*temporary\b/i, 'TEMPORARY'],
  [/\b(?:employment|position|job|worker)\s*type\s*:?\s*contract\b/i, 'CONTRACTOR'],
  [/\bposition type\s*:?\s*(?:permanent|regular)\b/i, 'FULL_TIME'],
  [/\bregular\s*-\s*full[-\s]?time\b/i, 'FULL_TIME'],
  [/\b(?:employment|position|job|worker)\s*type\s*:?\s*part[-\s]?time\b/i, 'PART_TIME'],
  [/\bregular\s*-\s*part[-\s]?time\b/i, 'PART_TIME'],
  [/\bthis is a part[-\s]?time (?:role|position)\b/i, 'PART_TIME'],
]

export function inferEmploymentType(
  existing: string | null | undefined,
  descriptionHtml: string | null | undefined
): string | null {
  if (existing) return existing
  const text = toText(descriptionHtml)
  if (!text) return null
  for (const [pattern, type] of EMPLOYMENT_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return null
}

// ── Closing date ─────────────────────────────────────────────────────────────

/**
 * Application deadline stated in the description.
 *
 * The Government of Alberta prints "Closing Date: August 4, 2026" on every
 * posting, which is a genuine validThrough for the JobPosting markup — Search
 * Console flags the field as missing otherwise. Some read "Open until suitable
 * candidate found", which is not a date and correctly yields null.
 */
export function extractClosingDate(descriptionHtml: string | null | undefined): string | null {
  const text = toText(descriptionHtml)
  if (!text) return null

  const m = text.match(
    /\b(?:closing date|application deadline|apply by|deadline)\s*[:\-–]\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i
  )
  if (!m) return null

  const parsed = new Date(m[1].replace(/\./g, ''))
  if (Number.isNaN(parsed.getTime())) return null

  // Deadlines run to the end of the stated day in Alberta.
  parsed.setUTCHours(23, 59, 59, 0)
  return parsed.toISOString()
}

/**
 * validThrough for the JobPosting markup, always producing a value.
 *
 * Preference order: the employer's stated deadline, then the stored expiry,
 * then a horizon from when we last confirmed the posting was live on the
 * employer's board. The fallback is honest because the sync expires a job the
 * moment it leaves that board and expired pages go noindex — so the date says
 * "known live as of the last check", which is exactly what we know.
 */
const FALLBACK_VALID_DAYS = 30

export function resolveValidThrough(job: {
  valid_through?: string | null
  description_html?: string | null
  last_seen_at?: string | null
  posted_at?: string | null
  created_at?: string
}): string {
  const stated = extractClosingDate(job.description_html)
  if (stated) return stated
  if (job.valid_through) return job.valid_through

  const anchor = job.last_seen_at || job.posted_at || job.created_at
  const base = anchor ? new Date(anchor) : new Date()
  const from = Number.isNaN(base.getTime()) ? new Date() : base
  return new Date(from.getTime() + FALLBACK_VALID_DAYS * 86_400_000).toISOString()
}

/**
 * employmentType for the markup. Google accepts OTHER for roles that fit none
 * of its categories, which beats omitting the field — several employers here
 * (Greenhouse boards especially) simply never state it.
 */
export function resolveEmploymentType(
  existing: string | null | undefined,
  descriptionHtml: string | null | undefined
): string {
  return inferEmploymentType(existing, descriptionHtml) ?? 'OTHER'
}

// ── Pay ──────────────────────────────────────────────────────────────────────

/**
 * Pay stated as a labelled field inside the description.
 *
 * None of the ATS list endpoints return a salary, but a third of these
 * employers print one in the body — SAIT as "Salary range: $74,532.00 -
 * $87,460.89", ENMAX as "Salary: $72.36 per hour", Capital Power as "Range:
 * $33.91 to $40.45 per hour".
 *
 * Only labelled fields are read. Loose prose is left alone: a sentence like
 * "budgets exceeding $100 million" is a job duty, and "a base salary of
 * $98,300, a midpoint of $115,700" describes a pay band in a way that would be
 * misleading to quote as the rate. A wrong salary is worse than no salary.
 */
const PAY_LABEL = /\b(?:salary range|pay range|hiring range|salary|wage|pay rate|compensation|range)\s*[:\-–]\s*/i

const AMOUNT = String.raw`\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?`
const PAY_VALUE = new RegExp(
  String.raw`^(${AMOUNT})(?:\s*(?:to|-|–|—)\s*\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?))?` +
  String.raw`\s*((?:per|an|\/)\s*(?:hour|hr|year|annum)|hourly|annually)?`,
  'i'
)

export function extractPay(descriptionHtml: string | null | undefined): string | null {
  const text = toText(descriptionHtml)
  if (!text) return null

  const labelMatch = text.match(PAY_LABEL)
  if (!labelMatch || labelMatch.index === undefined) return null

  const after = text.slice(labelMatch.index + labelMatch[0].length).trimStart()
  const m = after.match(PAY_VALUE)
  if (!m) return null

  const low = m[1].replace(/\s/g, '')
  const high = m[2] ? `$${m[2]}` : null
  const rawUnit = (m[3] ?? '').toLowerCase()

  // Normalise the unit; infer from magnitude when unstated, using the same
  // under-200-is-hourly rule the rest of the board uses.
  let unit = ''
  if (/hour|hr|hourly/.test(rawUnit)) unit = ' an hour'
  else if (/year|annum|annually/.test(rawUnit)) unit = ' a year'
  else {
    const numeric = Number(low.replace(/[$,]/g, ''))
    unit = numeric > 0 && numeric < 200 ? ' an hour' : ' a year'
  }

  return high ? `${low}–${high}${unit}` : `${low}${unit}`
}
