import { Metadata } from 'next'
import Link from 'next/link'
import { getActiveJobs, getCompaniesWithJobs, JOB_CITY_LABELS } from '@/lib/jobs'
import { JobsItemListStructuredData } from '@/components/seo/structured-data'
import { CompanyLogo } from '@/components/jobs/company-logo'
import JobsBrowser from './jobs-browser'
import EmployerDirectory, { type DirectoryEmployer } from './employer-directory'
import { sectorFor } from './employer-sectors'
import { toBrowserJob, logoDomainFor, logoSrcFor } from './shared'

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
  const companies = await getCompaniesWithJobs()

  // Resolved here rather than in the client component so the logo and sector
  // lookups — which read the ATS board registry — stay on the server.
  const directoryEmployers: DirectoryEmployer[] = companies.map(c => ({
    company: c.company,
    slug: c.slug,
    jobCount: c.jobCount,
    cities: c.cities.map(city => JOB_CITY_LABELS[city]),
    cityCounts: Object.fromEntries(
      Object.entries(c.cityCounts).map(([city, n]) => [JOB_CITY_LABELS[city as keyof typeof JOB_CITY_LABELS], n])
    ),
    sector: sectorFor(c.company),
    logoDomain: logoDomainFor({ ats_board: c.atsBoard, company: c.company }),
    logoSrc: logoSrcFor({ company: c.company }),
  }))

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
                Every listing links straight to the employer&apos;s own careers site. Listings come from
                employer job feeds and our own curation; always confirm details on the employer&apos;s posting.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* 60,000 positions with an October 10 deadline is worth a standing
                pointer, but as a full-width blue card with its own call-to-action
                it read as the page's headline and pushed the search box and the
                board itself down. One quiet line keeps the guide reachable
                without competing with the thing readers came for. */}
            <Link
              href="/jobs/elections-alberta"
              className="mb-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-colors hover:border-gray-300 hover:bg-gray-100"
            >
              <CompanyLogo company="Elections Alberta" domain="elections.ab.ca" size={28} />
              <span className="min-w-0 flex-1 text-gray-700">
                <span className="font-semibold text-gray-900">
                  Elections Alberta is hiring 60,000 Albertans
                </span>{' '}
                — every role and the October 10 deadline.
              </span>
              <span className="flex-shrink-0 font-semibold text-blue-600">Guide →</span>
            </Link>

            {/* Server-rendered job list for SEO */}
            <div className="sr-only">
              <h2>Latest job openings across Alberta</h2>
              <ul>
                {jobs.slice(0, 50).map(job => (
                  <li key={job.id}>
                    <a href={`/jobs/posting/${job.slug}`}>
                      {job.title} at {job.company} — {JOB_CITY_LABELS[job.city]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <JobsBrowser jobs={browserJobs} />

            {/* Employer directory. Gives readers a way to browse by name, and is
                the crawl path to every company page — without it those pages
                would only be reachable from individual postings. */}
            {directoryEmployers.length > 0 && (
              <EmployerDirectory employers={directoryEmployers} />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
