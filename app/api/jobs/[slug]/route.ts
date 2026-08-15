/**
 * Full posting detail for one job, fetched when a row is selected on the board.
 *
 * The board ships 500 rows to the browser and every one of them carries a
 * ~7.5KB description — over 10MB if it went in the page payload, for text the
 * reader will look at one job at a time. So the list ships snippets and this
 * route serves the real thing on selection.
 *
 * Public data behind a long CDN cache: the same three or four postings get
 * opened over and over, and the sync only rewrites descriptions once a day.
 */

import { NextResponse } from 'next/server'
import { getJobBySlug, isJobExpired, formatSalary, JOB_CITY_LABELS } from '@/lib/jobs'
import { prepareJobDescription } from '@/lib/job-description-html'
import { detectUnionStatus, inferEmploymentType, extractPay } from '@/lib/job-attributes'
import { employmentLabel } from '@/app/jobs/shared'

export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const job = await getJobBySlug(slug)

  if (!job || job.status === 'draft') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(
    {
      id: job.id,
      slug: job.slug,
      applyUrl: job.apply_url,
      expired: isJobExpired(job),
      descriptionHtml: prepareJobDescription(job.description_html),
      // Falls back to the snippet so the panel is never blank for the handful
      // of rows whose description never arrived.
      snippet: job.description_snippet ?? '',
      locationRaw: job.location_raw || `${JOB_CITY_LABELS[job.city]}, Alberta`,
      salaryText: formatSalary(job) || extractPay(job.description_html) || null,
      employmentType: employmentLabel(inferEmploymentType(job.employment_type, job.description_html)) ?? null,
      unionStatus: detectUnionStatus(job.description_html),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
