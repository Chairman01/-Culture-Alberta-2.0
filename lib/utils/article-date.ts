/**
 * The date stamp on an article card in a listing grid.
 *
 * Relative while "relative" still tells the reader something, absolute after
 * that. The city all-articles pages each carried their own copy of this, and
 * three of them ended on `return '3 weeks ago'` — a catch-all that printed the
 * same string for an article from last month and one from last year. On
 * /edmonton/all-articles, which runs to hundreds of cards in date order, the
 * entire tail of the grid read "3 weeks ago" and made a complete archive look
 * like a broken one.
 */
export function formatArticleDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Recently'

    const diffDays = Math.ceil(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return '1 week ago'
    if (diffDays < 31) return `${Math.floor(diffDays / 7)} weeks ago`

    return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}
