/**
 * Shared bearer-token auth for scheduled endpoints.
 *
 * Vercel Cron attaches `Authorization: Bearer <CRON_SECRET>` to its requests
 * ONLY when an env var named exactly CRON_SECRET exists — the name is fixed by
 * the platform. Without it Vercel sends no auth header at all and every cron
 * route 401s, which is how the daily jobs sync silently stopped running.
 *
 * CRON_SECRET is therefore always accepted. Routes pass whichever additional
 * secret they were already documented with (AUTOMATION_CRON_SECRET by default,
 * NEWSLETTER_CRON_SECRET for the newsletter) so manual calls keep working and
 * one route's secret never unlocks another's.
 *
 * The `x-vercel-cron` header is deliberately NOT accepted: Vercel does not
 * strip it from inbound requests, so any caller can set it and trigger the job.
 */

import type { NextRequest } from 'next/server'

export function isCronAuthorized(
  req: NextRequest,
  label: string,
  routeSecrets: (string | undefined)[] = [process.env.AUTOMATION_CRON_SECRET]
): boolean {
  const secrets = [process.env.CRON_SECRET, ...routeSecrets].filter((s): s is string => !!s)
  if (secrets.length === 0) {
    console.error(`[${label}] no cron secret configured — set CRON_SECRET`)
    return false
  }

  const header = req.headers.get('authorization')
  if (!header) return false

  return secrets.some(secret => header === `Bearer ${secret}`)
}
