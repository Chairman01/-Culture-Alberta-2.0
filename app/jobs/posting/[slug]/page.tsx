import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobBySlug, isJobExpired, isIndexableJob, formatSalary, getMoreJobsAtCompany, companySlug, JOB_CITY_LABELS } from '@/lib/jobs'
import { JobPostingStructuredData } from '@/components/seo/structured-data'
import { JobActions } from '@/components/jobs/job-actions'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { detectUnionStatus, inferEmploymentType, extractPay } from '@/lib/job-attributes'
import { prepareJobDescription } from '@/lib/job-description-html'
import { formatPostedDate, employmentLabel, logoDomainFor, logoSrcFor } from '../../shared'

export const revalidate = 3600

const BASE_URL = 'https://www.culturealberta.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job) return {}

  const cityLabel = JOB_CITY_LABELS[job.city] || job.city
  const expired = isJobExpired(job)
  const description = (job.description_snippet || `${job.title} position at ${job.company} in ${cityLabel}, Alberta.`).slice(0, 160)

  return {
    title: `${job.title} at ${job.company} — ${cityLabel} | Culture Alberta Jobs`,
    description,
    // Index only postings we own. Expired ones must drop out per Google's job
    // policy, and aggregator postings are duplicate snippets Google already
    // refuses to crawl — offering them just spends crawl budget on our articles.
    // `follow` stays on so the links back to the city boards still carry.
    robots: isIndexableJob(job) ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: `${BASE_URL}/jobs/posting/${job.slug}` },
    openGraph: {
      title: `${job.title} at ${job.company} — ${cityLabel}`,
      description,
      type: 'website',
    },
  }
}

export default async function JobPostingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job || job.status === 'draft') notFound()

  const cityLabel = JOB_CITY_LABELS[job.city] || job.city
  const expired = isJobExpired(job)
  // The feed rarely carries pay; a third of these employers state it in the
  // description body instead, so fall back to reading it from there.
  const salary = formatSalary(job) || extractPay(job.description_html)
  const posted = formatPostedDate(job.posted_at)
  const empLabel = employmentLabel(inferEmploymentType(job.employment_type, job.description_html))
  const unionStatus = detectUnionStatus(job.description_html)
  const descriptionHtml = prepareJobDescription(job.description_html)
  const moreAtCompany = await getMoreJobsAtCompany(job.company, job.id)

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Jobs", "item": `${BASE_URL}/jobs` },
      { "@type": "ListItem", "position": 3, "name": `${cityLabel} Jobs`, "item": `${BASE_URL}/jobs/${job.city}` },
      { "@type": "ListItem", "position": 4, "name": job.title, "item": `${BASE_URL}/jobs/posting/${job.slug}` },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* JobPosting markup renders ONLY for active manual jobs with a full
            description — the component itself enforces the guard. */}
        <JobPostingStructuredData job={job} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-3xl px-4 md:px-6">
            <nav className="mb-6 text-sm text-gray-500">
              <Link href="/jobs" className="hover:underline">Jobs</Link>
              {' / '}
              <Link href={`/jobs/${job.city}`} className="hover:underline">{cityLabel} Jobs</Link>
            </nav>

            {expired && (
              <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This posting has expired and may no longer be accepting applications.{' '}
                <Link href={`/jobs/${job.city}`} className="font-semibold underline">
                  See current {cityLabel} jobs →
                </Link>
              </div>
            )}

            <div className="flex items-start gap-4">
              <CompanyLogo company={job.company} domain={logoDomainFor(job)} src={logoSrcFor(job)} size={64} />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
                <Link
                  href={`/jobs/company/${companySlug(job.company)}`}
                  className="mt-2 inline-block text-lg text-blue-700 hover:underline"
                >
                  {job.company}
                </Link>
              </div>
            </div>

            {/* Pay leads when we have it — it's the first thing anyone looks
                for, and burying it in a row of grey chips wastes the one detail
                most of these postings don't publish. */}
            {salary && (
              <div className="mt-5 inline-flex items-baseline gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-xl font-bold text-emerald-900">{salary}</span>
                <span className="text-sm text-emerald-800">
                  {unionStatus === 'union' ? 'union rate' : 'as posted by the employer'}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{job.location_raw || `${cityLabel}, Alberta`}</span>
              {job.category && <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{job.category}</span>}
              {empLabel && <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{empLabel}</span>}
              {unionStatus !== 'unknown' && (
                <span className={`rounded px-2.5 py-1 font-medium ${
                  unionStatus === 'union'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {unionStatus === 'union' ? 'Union position' : 'Non-union'}
                </span>
              )}
            </div>

            {posted && (
              <p className="mt-3 text-sm text-gray-500">Posted {posted}</p>
            )}

            <div className="mt-6">
              <JobActions
                jobId={job.id}
                applyUrl={job.apply_url}
                expired={expired}
                company={job.company}
              />
              {!expired && (
                <p className="mt-2 text-xs text-gray-500">
                  Your application goes straight to {job.company}&apos;s own careers site.
                </p>
              )}
            </div>

            {job.company === 'Elections Alberta' && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
                <p className="text-sm text-blue-900">
                  <strong>Hiring in all 87 electoral divisions.</strong> Our full guide covers every
                  role, the October 10 application deadline, and a searchable map of every division.
                </p>
                <Link
                  href="/jobs/elections-alberta"
                  className="mt-2 inline-block text-sm font-semibold text-blue-700 underline hover:text-blue-900"
                >
                  Elections Alberta hiring guide →
                </Link>
              </div>
            )}

            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold mb-3">About this job</h2>
              {descriptionHtml ? (
                /* .job-description, not `prose` — this project doesn't install
                   the Tailwind typography plugin, so prose classes are inert.
                   See the block in globals.css. */
                <div
                  className="job-description"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <>
                  <p className="text-gray-700 leading-relaxed">{job.description_snippet}</p>
                  {!expired && (
                    <p className="mt-3 text-sm text-gray-500">
                      This is a summary — the full description is on the employer&apos;s posting.
                    </p>
                  )}
                </>
              )}
            </div>

            {moreAtCompany.length > 0 && (
              <div className="mt-10 border-t pt-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold">More jobs at {job.company}</h2>
                  <Link
                    href={`/jobs/company/${companySlug(job.company)}`}
                    className="flex-shrink-0 text-sm font-medium text-blue-700 hover:underline"
                  >
                    See all →
                  </Link>
                </div>
                <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
                  {moreAtCompany.map(other => (
                    <li key={other.id}>
                      <Link
                        href={`/jobs/posting/${other.slug}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <CompanyLogo company={other.company} domain={logoDomainFor(other)} src={logoSrcFor(other)} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-900">{other.title}</span>
                          <span className="block truncate text-sm text-gray-500">
                            {other.location_raw || JOB_CITY_LABELS[other.city]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom padding clears the sticky mobile apply bar. */}
            <div className="mt-10 flex items-center justify-between border-t pt-6 pb-20 md:pb-0">
              <Link href={`/jobs/${job.city}`} className="text-sm font-medium text-blue-700 hover:underline">
                ← More {cityLabel} jobs
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
