/**
 * Paste helpers for the article editor.
 *
 * Writers copy tables from three kinds of place:
 *
 *  1. Claude's "Copy" button and most chat tools put Markdown on the
 *     clipboard, so a table arrives as `| a | b |` lines of plain text. The
 *     editor would store those as paragraphs. `markdownTableToHtml` turns
 *     them into a real table first.
 *  2. Web pages and spreadsheets put HTML on the clipboard, wrapped in the
 *     source's inline styles, column widths, fonts and sizes. The editor's
 *     TextStyle and FontFamily marks would keep those, so the pasted block
 *     ends up in Inter 14px inside an 18px serif article. `cleanPastedHtml`
 *     strips that dressing so the paste takes the article's own style.
 *  3. Spreadsheets also offer tab-separated plain text when there is no HTML.
 *     `delimitedTextToHtml` handles that.
 *
 * Everything here is pure string work with no editor dependency, so it can
 * be unit-tested in Node.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Inline Markdown that is common inside table cells: bold, italics, links, code. */
function inlineMarkdown(text: string): string {
  let out = escapeHtml(text.trim())
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  return out
}

/** Splits one `| a | b |` line into its cells, dropping the outer pipes. */
function splitPipeRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  // A `\|` inside a cell is a literal pipe.
  return row.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim())
}

const SEPARATOR_ROW = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

/**
 * Finds every Markdown pipe table in a block of plain text and returns the
 * text with each table replaced by HTML. Lines outside tables come back as
 * paragraphs so a mixed paste (a sentence, a table, a sentence) keeps its
 * order. Returns null when the text holds no table at all, so the caller
 * can let the editor handle the paste normally.
 */
export function markdownTableToHtml(text: string): string | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let found = false
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1]
    const isTableStart =
      line.includes('|') &&
      next !== undefined &&
      SEPARATOR_ROW.test(next) &&
      splitPipeRow(line).length >= 2

    if (!isTableStart) {
      const trimmed = line.trim()
      if (trimmed) out.push(`<p>${inlineMarkdown(trimmed)}</p>`)
      i += 1
      continue
    }

    found = true
    const headers = splitPipeRow(line)
    const aligns = splitPipeRow(next).map((cell) => {
      const left = cell.startsWith(':')
      const right = cell.endsWith(':')
      if (left && right) return 'center'
      if (right) return 'right'
      return null
    })
    i += 2

    const rows: string[][] = []
    while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
      rows.push(splitPipeRow(lines[i]))
      i += 1
    }

    const cols = headers.length
    const cell = (tag: 'th' | 'td', value: string | undefined, col: number) => {
      const align = aligns[col]
      const attrs = align ? ` style="text-align: ${align}"` : ''
      return `<${tag}${attrs}><p>${inlineMarkdown(value ?? '')}</p></${tag}>`
    }

    const head = `<tr>${headers.map((h, c) => cell('th', h, c)).join('')}</tr>`
    const body = rows
      .map((row) => `<tr>${Array.from({ length: cols }, (_, c) => cell('td', row[c], c)).join('')}</tr>`)
      .join('')

    out.push(`<table><tbody>${head}${body}</tbody></table>`)
  }

  return found ? out.join('') : null
}

/**
 * Tab-separated rows (a spreadsheet selection with no HTML flavour) become a
 * table with the first row as the header. Needs at least two rows and the
 * same number of tabs on each, so ordinary prose that happens to hold a tab
 * is left alone.
 */
export function delimitedTextToHtml(text: string): string | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) return null
  const rows = lines.map((l) => l.split('\t'))
  const cols = rows[0].length
  if (cols < 2 || rows.some((r) => r.length !== cols)) return null

  const cell = (tag: 'th' | 'td', value: string) => `<${tag}><p>${escapeHtml(value.trim())}</p></${tag}>`
  const [head, ...body] = rows
  return (
    '<table><tbody>' +
    `<tr>${head.map((h) => cell('th', h)).join('')}</tr>` +
    body.map((r) => `<tr>${r.map((v) => cell('td', v)).join('')}</tr>`).join('') +
    '</tbody></table>'
  )
}

/**
 * Strips the source page's presentation from pasted HTML so the editor's
 * own marks and the article CSS decide how it looks. Keeps the attributes
 * that carry meaning: links, image sources, column and row spans.
 *
 * Also drops the wrappers Word, Google Docs and some sites add around a
 * copied table (meta tags, <colgroup>, nested <div>s with only a table in
 * them) so the editor sees a plain <table>.
 */
export function cleanPastedHtml(html: string): string {
  let out = html
    // Office/Google clipboard prologue and anything that is not content.
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(meta|link|style|script|colgroup|col)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi, '')
    // Google Docs wraps the whole paste in <b style="font-weight:normal">.
    .replace(/<b\s+style="font-weight:\s*normal[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
    // Google Docs and Word express bold as a span style. Keep the bold as a
    // real <strong> before the spans themselves go.
    .replace(/<span\b[^>]*style="[^"]*font-weight:\s*(?:700|800|900|bold)\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>')
    // Font and size spans from the source. Their text stays, the span goes.
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<font\b[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')

  // Presentation attributes on everything that remains.
  out = out.replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase()
    if (t === 'a') {
      const href = attrs.match(/\shref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)
      return href ? `<a href=${href[1]}>` : '<a>'
    }
    if (t === 'img') {
      const src = attrs.match(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)
      const alt = attrs.match(/\salt\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)
      return `<img${src ? ` src=${src[1]}` : ''}${alt ? ` alt=${alt[1]}` : ''}>`
    }
    const kept: string[] = []
    if (t === 'td' || t === 'th') {
      for (const name of ['colspan', 'rowspan']) {
        const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'))
        if (m) kept.push(`${name}=${m[1]}`)
      }
    }
    const closing = /\/\s*$/.test(attrs) ? ' /' : ''
    return `<${t}${kept.length ? ' ' + kept.join(' ') : ''}${closing}>`
  })

  // A table whose first row is all <td>s holding only bold text is a header
  // row by any reader's eye. Promote it so the editor marks it as one.
  out = out.replace(/<table>([\s\S]*?)<tr>([\s\S]*?)<\/tr>/i, (whole, before: string, firstRow: string) => {
    if (/<th\b/i.test(firstRow)) return whole
    const cells = firstRow.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []
    if (!cells.length) return whole
    const allBold = cells.every((c) => /^<td\b[^>]*>\s*(?:<p>\s*)?<(?:strong|b)\b/i.test(c))
    if (!allBold) return whole
    const promoted = firstRow
      .replace(/<td\b/gi, '<th')
      .replace(/<\/td>/gi, '</th>')
      .replace(/<\/?(?:strong|b)\b[^>]*>/gi, '')
    return `<table>${before}<tr>${promoted}</tr>`
  })

  return out
}

/**
 * Decides what to insert for a paste. HTML with a table in it is cleaned;
 * HTML without one is left for the editor's normal handling (returns null)
 * so inline pastes keep behaving as before; plain text is checked for
 * Markdown or tab-separated tables.
 */
export function htmlForPaste(html: string, text: string): string | null {
  if (html && /<table\b/i.test(html)) return cleanPastedHtml(html)
  if (html) return null
  if (!text) return null
  return markdownTableToHtml(text) ?? delimitedTextToHtml(text)
}
