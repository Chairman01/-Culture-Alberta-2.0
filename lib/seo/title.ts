/**
 * <title> tag builder.
 *
 * Google renders roughly 60 characters (~580px) of a title before truncating,
 * and Bing flags anything longer as "title too long" at high severity. On
 * 2026-08-31, 714 of 741 published articles had headlines over 60 characters
 * (average 93, longest 154) and every one was then suffixed with
 * " | Culture Alberta" — so the suffix was never seen and, on the average
 * page, a third of the headline was cut off in the results page.
 *
 * Rules, in order:
 *   1. An editor-written seo_title wins (the editor caps it at MAX_TITLE_LENGTH;
 *      anything longer that reaches here is cut the same way as a headline).
 *   2. Otherwise the headline is cut at a word boundary to fit.
 *   3. The site suffix is appended only when the whole thing still fits. A
 *      brand suffix that gets truncated is worse than no suffix.
 *
 * Only the <title> tag uses this. og:title and twitter:title keep the full
 * headline: social cards have their own, longer limits, and Reddit — 65% of
 * sessions in August 2026 — renders og:title on link previews.
 */

export const MAX_TITLE_LENGTH = 60
export const SITE_NAME = 'Culture Alberta'
const SUFFIX = ` | ${SITE_NAME}`

function collapseWhitespace(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim()
}

// Words a cut should not end on: "…Seen Over Downtown in" reads as broken,
// "…Seen Over Downtown" reads as a title.
const DANGLING_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'from', 'with', 'as', 'into', 'over', 'after', 'before', 'is', 'are', 'was', 'its', "it's", 'this', 'that', 'than', 'vs', 'v',
])

/**
 * Cut `text` to at most `max` characters without splitting a word, then drop
 * any punctuation or dangling little word the cut leaves behind
 * ("…Calgary -", "…hail,", "…Downtown in").
 * Falls back to a hard cut only when the first word alone is longer than `max`.
 */
export function truncateAtWord(text: string, max: number = MAX_TITLE_LENGTH): string {
  const clean = collapseWhitespace(text)
  if (clean.length <= max) return clean

  // Look one past the limit: a space exactly at `max` means the word before it
  // fits in full.
  const window = clean.slice(0, max + 1)
  const lastSpace = window.lastIndexOf(' ')
  let cut = lastSpace > 0 ? window.slice(0, lastSpace) : clean.slice(0, max)

  for (;;) {
    const trimmed = cut.replace(/[\s\-–—:,;|.]+$/, '').trim()
    const words = trimmed.split(' ')
    if (words.length > 1 && DANGLING_WORDS.has(words[words.length - 1].toLowerCase())) {
      cut = words.slice(0, -1).join(' ')
      continue
    }
    return trimmed
  }
}

/**
 * The string that goes in <title>. Never longer than MAX_TITLE_LENGTH.
 */
export function buildSeoTitle(headline: string, seoTitle?: string | null): string {
  const custom = collapseWhitespace(seoTitle || '')
  if (custom) return truncateAtWord(custom, MAX_TITLE_LENGTH)

  const base = collapseWhitespace(headline)
  if (!base) return SITE_NAME

  // Headlines that already carry the brand keep the old behaviour (no double suffix).
  if (base.includes(SITE_NAME)) return truncateAtWord(base, MAX_TITLE_LENGTH)

  if (base.length + SUFFIX.length <= MAX_TITLE_LENGTH) return `${base}${SUFFIX}`
  return truncateAtWord(base, MAX_TITLE_LENGTH)
}

/**
 * What the editor sees under the SEO-title field: the exact string Google will
 * receive for this article, given the current headline and override.
 */
export function previewSeoTitle(headline: string, seoTitle?: string | null): string {
  return buildSeoTitle(headline, seoTitle)
}
