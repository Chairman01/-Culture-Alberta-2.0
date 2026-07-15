import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobBySlug, isJobExpired, formatSalary, JOB_CITY_LABELS } from '@/lib/jobs'
import { JobPostingStructuredData } from '@/components/seo/structured-data'
import { AdzunaAttribution } from '@/components/jobs/adzuna-attribution'
import { JobActions } from '@/components/jobs/job-actions'
import { formatPostedDate, employmentLabel } from '../../shared'

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
    // Expired postings must not stay in the index (Google jobs policy)
    robots: expired ? { index: false, follow: true } : { index: true, follow: true },
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
  const salary = formatSalary(job)
  const posted = formatPostedDate(job.posted_at)
  const empLabel = employmentLabel(job.employment_type)

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

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
            <p className="mt-2 text-lg text-gray-700">{job.company}</p>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{job.location_raw || `${cityLabel}, Alberta`}</span>
              {job.category && <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{job.category}</span>}
              {empLabel && <span className="rounded bg-gray-100 px-2.5 py-1 text-gray-700">{empLabel}</span>}
              {salary && <span className="rounded bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">{salary}</span>}
            </div>

            {posted && (
              <p className="mt-3 text-sm text-gray-500">Posted {posted}</p>
            )}

            <div className="mt-6">
              <JobActions jobId={job.id} applyUrl={job.apply_url} expired={expired} />
              {!expired && (
                <p className="mt-2 text-xs text-gray-500">
                  You&apos;ll complete your application on the employer&apos;s own site — Culture Alberta never collects resumes.
                </p>
              )}
            </div>

            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold mb-3">About this job</h2>
              {job.description_html ? (
                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description_html }}
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

            <div className="mt-10 flex items-center justify-between border-t pt-6">
              <Link href={`/jobs/${job.city}`} className="text-sm font-medium text-blue-700 hover:underline">
                ← More {cityLabel} jobs
              </Link>
              {job.source === 'adzuna' && <AdzunaAttribution />}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
