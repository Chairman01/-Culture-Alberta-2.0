/**
 * Where a reader was standing when they decided to create an account.
 *
 * Stored on the user (auth user_metadata, same place as `city`) and on the
 * newsletter row, so growth from the jobs board can be told apart from growth
 * from articles — they want different follow-up and different emails.
 *
 * Derived from the `next` path the auth pages already carry, so existing links
 * keep working without every call site being updated. A `?src=` param wins when
 * present, which is what the jobs-article CTAs use: those live under /articles
 * but belong to the jobs funnel, and no path rule can tell them apart.
 */

export type SignupSource = 'jobs' | 'article' | 'events' | 'tools' | 'site'

const VALID: readonly SignupSource[] = ['jobs', 'article', 'events', 'tools', 'site']

export function isSignupSource(value: string | null | undefined): value is SignupSource {
  return !!value && (VALID as readonly string[]).includes(value)
}

/** Classify a destination path. Falls back to 'site' for the homepage, nav, footer. */
export function sourceFromPath(path: string | null | undefined): SignupSource {
  if (!path) return 'site'
  const p = path.split('?')[0].toLowerCase()
  if (p.startsWith('/jobs')) return 'jobs'
  if (p.startsWith('/events')) return 'events'
  if (p.startsWith('/tools')) return 'tools'
  if (p.startsWith('/articles')) return 'article'
  return 'site'
}

/**
 * Resolve the source for an auth page from its own query string.
 * `?src=` is explicit intent and beats whatever `next` happens to say.
 */
export function resolveSignupSource(search: string | URLSearchParams): {
  source: SignupSource
  path: string | null
} {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const next = params.get('next')
  const explicit = params.get('src')
  return {
    source: isSignupSource(explicit) ? explicit : sourceFromPath(next),
    path: next,
  }
}

/** Newsletter topic slugs. Each is a separate CASL express consent — never inferred. */
export type NewsletterTopic = 'culture' | 'jobs'
