/**
 * What the matched-jobs email WOULD contain, for review. Sends nothing.
 *
 * There is deliberately no send route to pair with this yet. The digest is only
 * worth wiring to a mailer once the matches on this preview look right, and a
 * live sending path that nobody has read the output of is how a list gets
 * mailed something it shouldn't. Admin only.
 *
 *   GET /api/admin/jobs-digest/preview?days=7&max=10
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { buildJobsDigest } from '@/lib/jobs-digest'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const { searchParams } = req.nextUrl
  const days = Math.min(90, Math.max(1, Number(searchParams.get('days')) || 7))
  const max = Math.min(50, Math.max(1, Number(searchParams.get('max')) || 10))

  try {
    const { recipients, optedIn, jobsConsidered } = await buildJobsDigest({
      sinceDays: days,
      maxPerUser: max,
    })

    return NextResponse.json({
      preview: true,
      sent: false,
      windowDays: days,
      optedIn,
      jobsConsidered,
      wouldReceive: recipients.length,
      recipients: recipients.map(r => ({
        email: r.email,
        matchCount: r.jobs.length,
        jobs: r.jobs.map(j => ({
          title: j.title,
          company: j.company,
          city: j.city,
          salary: j.salaryText,
          because: j.reasons,
          url: `https://www.culturealberta.com/jobs/posting/${j.slug}`,
        })),
      })),
    })
  } catch (err) {
    console.error('[admin/jobs-digest/preview]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build the digest' },
      { status: 500 }
    )
  }
}
