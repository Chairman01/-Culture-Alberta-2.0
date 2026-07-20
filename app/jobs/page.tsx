import { Metadata } from 'next'
import Link from 'next/link'
import { getActiveJobs } from '@/lib/jobs'
import { JobsItemListStructuredData } from '@/components/seo/structured-data'
import { AdzunaAttribution } from '@/components/jobs/adzuna-attribution'
import JobsBrowser from './jobs-browser'
import { toBrowserJob } from './shared'

export const metadata: Metadata = {
  title: 'Alberta Jobs Board | Who\'s Hiring in Calgary & Edmonton',
  description:
    'Browse the latest job openings in Calgary and Edmonton — updated daily. Search by category and salary, save jobs, and apply directly on the employer\'s site.',
  openGraph: {
    title: 'Alberta Jobs Board | Culture Alberta',
    description:
      'The latest job openings in Calgary and Edmonton, updated daily. Apply directly on the employer\'s site.',
    type: 'website',
  },
  alternates: { canonical: 'https://www.culturealberta.com/jobs' },
}

export const revalidate = 3600

export default async function JobsPage() {
  const jobs = await getActiveJobs()
  const browserJobs = jobs.map(toBrowserJob)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <JobsItemListStructuredData
          jobs={jobs.map(j => ({ slug: j.slug, title: j.title }))}
          pageUrl="/jobs"
          listName="Job openings in Calgary and Edmonton, Alberta"
        />

        <section className="w-full py-12 md:py-16 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Alberta Jobs Board</h1>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Who&apos;s hiring in Alberta right now:{' '}
                <Link href="/jobs/calgary" className="underline hover:text-gray-900">Calgary</Link> and{' '}
                <Link href="/jobs/edmonton" className="underline hover:text-gray-900">Edmonton</Link> openings,
                updated daily.{' '}
                <Link href="/auth/signup?next=/jobs" className="font-semibold underline hover:text-gray-900">
                  Create a free account
                </Link>{' '}
                to apply, save jobs, and track every application in one place.
              </p>
              <p className="max-w-[800px] text-sm text-muted-foreground">
                You apply on the employer&apos;s own site — we never collect resumes. Listings come from
                employer job feeds and our own curation; always confirm details on the employer&apos;s posting.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* Server-rendered job list for SEO */}
            <div className="sr-only">
              <h2>Latest job openings in Calgary and Edmonton</h2>
              <ul>
                {jobs.slice(0, 50).map(job => (
                  <li key={job.id}>
                    <a href={`/jobs/posting/${job.slug}`}>
                      {job.title} at {job.company} — {job.city === 'calgary' ? 'Calgary' : 'Edmonton'}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <JobsBrowser jobs={browserJobs} />

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
