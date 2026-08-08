import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJobsByCompanySlug, getCompaniesWithJobs, JOB_CITY_LABELS } from '@/lib/jobs'
import { JobsItemListStructuredData } from '@/components/seo/structured-data'
import { CompanyLogo } from '@/components/jobs/company-logo'
import JobsBrowser from '../../jobs-browser'
import { toBrowserJob, logoDomainFor, logoSrcFor } from '../../shared'

/**
 * One page per hiring employer.
 *
 * Earns its place twice over: it's the landing page for "<company> careers
 * Calgary" searches — a query the individual postings compete with each other
 * for — and it's the thing a reader follows when they want to hear about a
 * specific employer rather than a whole city.
 */

export const revalidate = 3600

const BASE_URL = 'https://www.culturealberta.com'

export async function generateStaticParams() {
  const companies = await getCompaniesWithJobs()
  return companies.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const jobs = await getJobsByCompanySlug(slug)
  if (jobs.length === 0) return {}

  const company = jobs[0].company
  const cities = [...new Set(jobs.map(j => JOB_CITY_LABELS[j.city]))]
  const where = cities.length === 1 ? cities[0] : cities.slice(0, 2).join(' and ')

  return {
    title: `${company} Jobs in Alberta — ${jobs.length} Open Role${jobs.length === 1 ? '' : 's'}`,
    description:
      `${jobs.length} open position${jobs.length === 1 ? '' : 's'} at ${company} in ${where}. ` +
      `See the full job descriptions and apply on ${company}'s own careers site.`,
    alternates: { canonical: `${BASE_URL}/jobs/company/${slug}` },
    openGraph: {
      title: `${company} is hiring in Alberta`,
      description: `${jobs.length} open role${jobs.length === 1 ? '' : 's'} at ${company} in ${where}.`,
      type: 'website',
    },
  }
}

export default async function CompanyJobsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jobs = await getJobsByCompanySlug(slug)
  if (jobs.length === 0) notFound()

  const company = jobs[0].company
  const domain = logoDomainFor(jobs[0])
  const cities = [...new Set(jobs.map(j => j.city))]
  const browserJobs = jobs.map(toBrowserJob)

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${BASE_URL}/jobs` },
      { '@type': 'ListItem', position: 3, name: `${company} jobs`, item: `${BASE_URL}/jobs/company/${slug}` },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <JobsItemListStructuredData
          jobs={jobs.map(j => ({ slug: j.slug, title: j.title }))}
          pageUrl={`/jobs/company/${slug}`}
          listName={`Open roles at ${company} in Alberta`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
        />

        <section className="w-full py-12 md:py-16 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <nav className="mb-6 text-sm text-gray-500">
              <Link href="/jobs" className="hover:underline">Jobs</Link>
              {' / '}
              <span className="text-gray-700">{company}</span>
            </nav>

            <div className="flex items-start gap-4">
              <CompanyLogo company={company} domain={domain} src={logoSrcFor(jobs[0])} size={72} />
              <div className="min-w-0 space-y-3">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  {company} jobs in Alberta
                </h1>
                <p className="max-w-[800px] text-muted-foreground md:text-lg">
                  {jobs.length} open role{jobs.length === 1 ? '' : 's'} at {company} in{' '}
                  {cities.map((c, i) => (
                    <span key={c}>
                      {i > 0 && (i === cities.length - 1 ? ' and ' : ', ')}
                      <Link href={`/jobs/${c}`} className="underline hover:text-gray-900">
                        {JOB_CITY_LABELS[c]}
                      </Link>
                    </span>
                  ))}
                  . Full descriptions below — applications go straight to {company}.
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link
                    href={`/auth/signup?next=/jobs/company/${slug}`}
                    className="font-semibold underline hover:text-gray-900"
                  >
                    Create a free account
                  </Link>{' '}
                  to save these roles and track every application in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* Server-rendered list so the roles are in the HTML for crawlers */}
            <div className="sr-only">
              <h2>Open positions at {company}</h2>
              <ul>
                {jobs.map(job => (
                  <li key={job.id}>
                    <a href={`/jobs/posting/${job.slug}`}>
                      {job.title} — {JOB_CITY_LABELS[job.city]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <JobsBrowser jobs={browserJobs} />
          </div>
        </section>
      </main>
    </div>
  )
}
