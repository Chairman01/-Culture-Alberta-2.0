import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Shared hashtag derivation.
//
// Platforms differ in how many tags are worth carrying — Bluesky takes several,
// Threads only makes one of them a real topic tag — but the way a tag is spelled
// should be identical everywhere, so #GrandePrairie means the same thing on both.
// ---------------------------------------------------------------------------

/**
 * "grande prairie" → "GrandePrairie". Tags can't hold spaces or punctuation,
 * and a tag with no letter in it ("2026", "!!!") is rejected rather than posted.
 */
export function toHashtag(raw: string): string | null {
  const words = raw
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
  if (words.length === 0) return null

  const tag = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  if (tag.length > 64 || !/\p{L}/u.test(tag)) return null
  return tag
}

/**
 * City first — it's the tag a local reader is most likely to follow — then the
 * article's own tags. The category is usually repeated in the tag list, so
 * duplicates are dropped case-insensitively.
 */
export function collectHashtags(article: SocialArticle, max: number): string[] {
  const tags: string[] = []
  const seen = new Set<string>()

  for (const raw of [article.category, ...(article.tags ?? [])]) {
    if (tags.length >= max) break
    if (!raw) continue

    const tag = toHashtag(raw)
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(tag)
  }

  return tags
}
