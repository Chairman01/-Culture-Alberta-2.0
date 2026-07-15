/**
 * Minimal server-side HTML sanitizer for admin-authored rich text
 * (job descriptions). Strips script/style/iframe/object/embed blocks,
 * inline event handlers, and javascript: URLs. Defense-in-depth — this
 * content is only authored by signed-in admins.
 */
export function sanitizeAdminHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '$1="#"')
}
