/**
 * What the jobs email WOULD send, for review. Sends nothing — there is no code
 * path from here to the mailer.
 *
 *   GET /api/admin/jobs-email/preview            who is due today, and what they'd get
 *   GET /api/admin/jobs-email/preview?all=1      every jobs subscriber, ignoring the schedule
 *   GET /api/admin/jobs-email/preview?html=EMAIL the rendered email for one subscriber
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { buildJobsEmails } from '@/lib/jobs-email/build'
import { generateJobsEmailHtml, jobsEmailSubject } from '@/lib/jobs-email/template'
import { jobsEmailArmed, jobsEmailLinks, jobsEmailMailingAddress } from '@/lib/jobs-email/send'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const { searchParams } = req.nextUrl
  const htmlFor = searchParams.get('html')

  try {
    if (htmlFor) {
      const plan = await buildJobsEmails({ onlyEmail: htmlFor, ignoreSchedule: true })
      const recipient = plan.recipients[0]
      if (!recipient) {
        return NextResponse.json(
          { error: 'No email would be built: not a jobs subscriber, or nothing new in their area.' },
          { status: 404 }
        )
      }
      const html = generateJobsEmailHtml(
        recipient,
        jobsEmailLinks(recipient),
        jobsEmailMailingAddress() ?? '[SET CRM_MAILING_ADDRESS IN VERCEL]'
      )
      return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    const plan = await buildJobsEmails({ ignoreSchedule: searchParams.get('all') === '1' })
    return NextResponse.json({
      preview: true,
      sent: false,
      ...jobsEmailArmed(),
      subscribers: plan.subscribers,
      due: plan.due,
      nothingNew: plan.nothingNew,
      jobsConsidered: plan.jobsConsidered,
      wouldReceive: plan.recipients.length,
      recipients: plan.recipients.map(r => ({
        email: r.email,
        frequency: r.frequency,
        area: r.areaLabel,
        personalised: r.personalised,
        subject: jobsEmailSubject(r),
        moreCount: r.moreCount,
        jobs: r.jobs.map(j => ({
          title: j.title, company: j.company, city: j.city, pay: j.salaryText,
          age: j.ageLabel, closes: j.closesLabel, because: j.reasons,
        })),
      })),
    })
  } catch (err) {
    console.error('[admin/jobs-email/preview]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build the jobs email' },
      { status: 500 }
    )
  }
}
