import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveJobs, isJobCity, JOB_CITIES, JOB_CITY_LABELS } from '@/lib/jobs'
import { JobsItemListStructuredData } from '@/components/seo/structured-data'
import { AdzunaAttribution } from '@/components/jobs/adzuna-attribution'
import JobsBrowser from '../jobs-browser'
import { toBrowserJob } from '../shared'

export const revalidate = 3600

export function generateStaticParams() {
  return JOB_CITIES.map(city => ({ city }))
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params
  if (!isJobCity(city)) return {}
  const label = JOB_CITY_LABELS[city]
  return {
    title: `${label} Jobs | Who's Hiring in ${label} Right Now`,
    description: `The latest job openings in ${label}, Alberta — updated daily. Browse by category and salary, then apply directly on the employer's site.`,
    openGraph: {
      title: `${label} Jobs | Culture Alberta`,
      description: `Who's hiring in ${label} right now — the latest openings, updated daily.`,
      type: 'website',
    },
    alternates: { canonical: `https://www.culturealberta.com/jobs/${city}` },
  }
}

export default async function CityJobsPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  if (!isJobCity(city)) notFound()
  const label = JOB_CITY_LABELS[city]
  const otherCity = JOB_CITIES.find(c => c !== city)!
  const jobs = await getActiveJobs({ city })
  const browserJobs = jobs.map(toBrowserJob)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <JobsItemListStructuredData
          jobs={jobs.map(j => ({ slug: j.slug, title: j.title }))}
          pageUrl={`/jobs/${city}`}
          listName={`Job openings in ${label}, Alberta`}
        />

        <section className="w-full py-12 md:py-16 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">{label} Jobs</h1>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Who&apos;s hiring in {label} right now: the latest openings across health care,
                trades, tech, education and more, updated daily.{' '}
                <Link href={`/auth/signup?next=/jobs/${city}`} className="font-semibold underline hover:text-gray-900">
                  Create a free account
                </Link>{' '}
                to apply, save jobs, and track your applications.
              </p>
              <p className="max-w-[800px] text-sm text-muted-foreground">
                Also hiring: <Link href={`/jobs/${otherCity}`} className="underline hover:text-gray-900">{JOB_CITY_LABELS[otherCity]} jobs</Link>
                {' '}· <Link href="/jobs" className="underline hover:text-gray-900">All Alberta jobs</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* Server-rendered job list for SEO */}
            <div className="sr-only">
              <h2>Latest job openings in {label}</h2>
              <ul>
                {jobs.slice(0, 50).map(job => (
                  <li key={job.id}>
                    <a href={`/jobs/posting/${job.slug}`}>{job.title} at {job.company}</a>
                  </li>
                ))}
              </ul>
            </div>

            <JobsBrowser jobs={browserJobs} initialCity={label} />

            {/* Required by Adzuna's API terms whenever their listings are shown.
                Kept below the list rather than in the header: still present and
                still meets their 116x23px + linked-words spec. */}
            {jobs.some(j => j.source === 'adzuna') && (
              <div className="mt-8 border-t border-gray-200 pt-4">
                <AdzunaAttribution />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
