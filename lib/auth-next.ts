/**
 * Where to send someone once they are signed in.
 *
 * The auth pages carry a `?next=` path so a visitor who hit a sign-in gate —
 * most often the Apply button on a job — lands back on the thing they were
 * doing. Only same-site paths are honoured: `next` comes from the query string,
 * so anything else would be an open redirect.
 */

const OAUTH_NEXT_KEY = 'auth_next'

export function safeNext(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  // Bouncing back into the auth pages would loop.
  if (value.startsWith('/auth')) return '/'
  return value
}

/** The `next` on the current auth page's own URL. */
export function nextFromLocation(): string {
  try {
    return safeNext(new URLSearchParams(window.location.search).get('next'))
  } catch {
    return '/'
  }
}

/**
 * OAuth leaves the site and returns to /auth/callback. The return path rides in
 * sessionStorage rather than on the callback URL, because the provider redirect
 * has to match the allow-list configured in Supabase exactly — a query string
 * there risks the whole sign-in falling back to the site root.
 */
export function rememberNextForOAuth(): void {
  try {
    sessionStorage.setItem(OAUTH_NEXT_KEY, nextFromLocation())
  } catch {
    /* private mode — they land on the homepage, as before */
  }
}

export function takeNextAfterOAuth(): string {
  try {
    const next = safeNext(sessionStorage.getItem(OAUTH_NEXT_KEY))
    sessionStorage.removeItem(OAUTH_NEXT_KEY)
    return next
  } catch {
    return '/'
  }
}
