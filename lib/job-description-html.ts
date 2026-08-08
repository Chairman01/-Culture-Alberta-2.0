/**
 * Clean up job description HTML before it is rendered.
 *
 * Two jobs in one pass, both necessary.
 *
 * SAFETY — this markup comes from third-party ATS boards and is injected with
 * dangerouslySetInnerHTML. Script tags, event handlers and javascript: URLs are
 * stripped so a compromised or hostile employer board cannot run code on our
 * pages. Allow-listing tags rather than blocking known-bad ones means anything
 * unexpected is dropped by default.
 *
 * READABILITY — Workday in particular emits markup that Tailwind's `prose`
 * cannot style, because it isn't semantic: a single Cenovus posting carried 13
 * empty `<p style="text-align:inherit"></p>` spacers, bare text nodes floating
 * outside any element, and section headings marked up as `<p><b><u>…</u></b></p>`
 * rather than real headings. The result reads as one cramped wall of text with
 * arbitrary gaps. Normalising it lets the typography rules actually apply.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
  'h2', 'h3', 'h4', 'a', 'blockquote', 'hr', 'table', 'thead',
  'tbody', 'tr', 'th', 'td',
])

/** Only these survive on any element; everything else (style, class, on*) goes. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
}

function sanitize(html: string): string {
  return html
    // Drop dangerous elements together with their contents.
    .replace(/<(script|style|iframe|object|embed|form|input|noscript)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|noscript)\b[^>]*\/?>/gi, '')
    // Rewrite every remaining tag: allow-listed name, allow-listed attributes.
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (_full, close: string, rawName: string, attrs: string) => {
      const name = rawName.toLowerCase()
      if (!ALLOWED_TAGS.has(name)) return ''
      if (close) return `</${name}>`

      const allowed = ALLOWED_ATTRS[name]
      if (!allowed) return `<${name}>`

      const kept: string[] = []
      for (const m of attrs.matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
        const attr = m[1].toLowerCase()
        const value = m[2]
        if (!allowed.has(attr)) continue
        // Block javascript:, data: and vbscript: URLs.
        if (attr === 'href' && /^\s*(javascript|data|vbscript):/i.test(value)) continue
        kept.push(`${attr}="${value.replace(/"/g, '&quot;')}"`)
      }
      // External links from employer boards should not pass authority or
      // leak the referrer.
      if (name === 'a' && kept.length > 0) kept.push('rel="nofollow noopener noreferrer"', 'target="_blank"')
      return kept.length ? `<${name} ${kept.join(' ')}>` : `<${name}>`
    })
}

function normalise(html: string): string {
  let out = html

  // Pseudo-headings: <p><b><u>About this opportunity:</u></b></p> and the
  // bold-only variant, both of which Workday and Ashby use for section titles.
  out = out.replace(
    /<p>\s*<(?:b|strong)>\s*<u>([\s\S]{2,120}?)<\/u>\s*<\/(?:b|strong)>\s*<\/p>/gi,
    (_m, inner: string) => `<h3>${inner.trim()}</h3>`
  )
  out = out.replace(
    /<p>\s*<(?:b|strong)>([^<]{2,120}?:)\s*<\/(?:b|strong)>\s*<\/p>/gi,
    (_m, inner: string) => `<h3>${inner.replace(/:$/, '').trim()}</h3>`
  )

  // Empty paragraphs used as spacers — the main cause of the uneven gaps.
  out = out.replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, '')

  // Runs of <br> doing the same job.
  out = out.replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>')

  // Bare text floating outside any element ("Worker Type: Employee") — wrap it
  // so it inherits paragraph spacing instead of colliding with the next block.
  out = out.replace(/^([^<]{3,200}?)(?=<)/, (_m, text: string) =>
    text.trim() ? `<p>${text.trim()}</p>` : ''
  )

  return out.replace(/\s{2,}/g, ' ').trim()
}

/** Sanitize, then normalise. Returns '' for empty input so callers can branch. */
export function prepareJobDescription(html: string | null | undefined): string {
  if (!html) return ''
  return normalise(sanitize(html))
}
