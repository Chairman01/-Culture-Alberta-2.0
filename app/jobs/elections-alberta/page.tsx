import { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, CalendarDays, MapPin, ShieldCheck } from 'lucide-react'
import {
  ELECTIONS_ALBERTA,
  ELECTION_DATES,
  ELECTION_ROLES,
  ELIGIBILITY,
  INELIGIBLE,
  ELECTORAL_DIVISIONS,
} from '@/lib/elections-alberta'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { DivisionFinder } from '@/components/jobs/division-finder'

/**
 * Elections Alberta 2026 referendum hiring hub.
 *
 * 60,000 positions across all 87 electoral divisions is the largest recruitment
 * drive in Alberta's history, and it is the rare jobs story that touches every
 * reader of this site regardless of where they live. Elections Alberta's own
 * pages split the answer across three places — roles on one, dates on another,
 * boundary maps behind 87 collapsed accordion links — so the value here is
 * putting it in one place and making the divisions searchable.
 */

const BASE_URL = 'https://www.culturealberta.com'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Elections Alberta Jobs 2026 — 60,000 Referendum Positions, All 87 Divisions',
  description:
    'Elections Alberta is hiring 60,000 people for the October 19, 2026 referendum. All nine roles, the hiring deadline, who can apply, and a searchable map of all 87 electoral divisions.',
  alternates: { canonical: `${BASE_URL}/jobs/elections-alberta` },
  openGraph: {
    title: 'Elections Alberta is hiring 60,000 Albertans',
    description:
      'Every role, the October 10 application deadline, and how to find your electoral division — all 87 of them.',
    type: 'website',
  },
}

export default function ElectionsAlbertaPage() {
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many people is Elections Alberta hiring for the 2026 referendum?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A minimum of 60,000 election officers across all 87 provincial electoral divisions — the largest recruitment drive in Alberta’s history. The number is driven by a 48-hour deadline to count and report ballots.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the deadline to apply for an Elections Alberta job?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Hiring runs from July 15 to October 10, 2026. Applications close on October 10, ahead of advance voting on October 13–17 and referendum day on October 19.',
        },
      },
      {
        '@type': 'Question',
        name: 'How old do you have to be to work at an Alberta polling station?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You must be at least 16 and an Alberta resident eligible to work in Canada. Several roles, including Site Supervisor, Voting Officer and Count Supervisor, require you to be 18 or older.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do Elections Alberta jobs require a criminal record check?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. All election workers must pass a criminal record check, swear an oath upholding Elections Alberta’s non-partisan mandate, and take no part in political activity while employed.',
        },
      },
    ],
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${BASE_URL}/jobs` },
      { '@type': 'ListItem', position: 3, name: 'Elections Alberta jobs', item: `${BASE_URL}/jobs/elections-alberta` },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="w-full border-b border-gray-200 bg-muted/40 py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <nav className="mb-6 text-sm text-gray-500">
              <Link href="/jobs" className="hover:underline">Jobs</Link>
              {' / '}
              <span className="text-gray-700">Elections Alberta</span>
            </nav>

            <div className="flex items-start gap-4">
              <CompanyLogo company={ELECTIONS_ALBERTA.employer} domain={ELECTIONS_ALBERTA.domain} size={72} />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Elections Alberta is hiring 60,000 Albertans
                </h1>
                <p className="mt-3 max-w-3xl text-muted-foreground md:text-lg">
                  For the referendum on <strong>October 19, 2026</strong> — the largest recruitment
                  drive in Alberta&apos;s history. Positions are open in all{' '}
                  <strong>{ELECTIONS_ALBERTA.divisions} electoral divisions</strong>, so there is
                  work near you wherever in the province you live.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={ELECTIONS_ALBERTA.applyUrl}
                target="_blank"
                rel="nofollow noopener"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Apply on Elections Alberta <ExternalLink className="h-4 w-4" />
              </a>
              <a href="#divisions" className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Find your division
              </a>
            </div>

            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Applications close October 10, 2026.</strong> Training runs in early October,
              so late applications can&apos;t be placed.
            </p>
          </div>
        </section>

        {/* ── Key dates ────────────────────────────────────────────────── */}
        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6 text-gray-400" /> Key dates
            </h2>
            <dl className="mt-5 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
              {ELECTION_DATES.map(d => (
                <div key={d.label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="w-40 flex-shrink-0 font-semibold text-gray-900">{d.label}</dt>
                  <dd className="flex-1">
                    <span className="text-gray-900">{d.value}</span>
                    <span className="block text-sm text-gray-500">{d.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Roles ────────────────────────────────────────────────────── */}
        <section className="w-full border-t border-gray-200 py-10 md:py-14">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <h2 className="text-2xl font-bold">The nine roles</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              You pick your preferred roles when you apply. Elections Alberta has not published a
              public rate card for 2026 — all positions are paid, and the rate is confirmed during
              hiring.
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {ELECTION_ROLES.map(role => (
                <li key={role.title} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{role.title}</h3>
                    <span className="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {role.minAge}+
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{role.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Eligibility ──────────────────────────────────────────────── */}
        <section className="w-full border-t border-gray-200 py-10 md:py-14">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="h-6 w-6 text-gray-400" /> Who can apply
            </h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">You need to be</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {ELIGIBILITY.map(item => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">You can&apos;t apply if you are</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {INELIGIBLE.map(item => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Division finder ──────────────────────────────────────────── */}
        <section id="divisions" className="w-full scroll-mt-24 border-t border-gray-200 bg-muted/40 py-10 md:py-14">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <MapPin className="h-6 w-6 text-gray-400" /> Find your electoral division
            </h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Jobs are staffed division by division, and Elections Alberta asks which one you can
              work in. Type your city or town — not the division name — and this will tell you which
              divisions cover you. Calgary spans 26 of them; Okotoks sits inside one called Highwood.
            </p>

            <div className="mt-6">
              <DivisionFinder />
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Boundary maps are published by Elections Alberta and open as PDFs on their site.{' '}
              <a href={ELECTIONS_ALBERTA.overviewMapUrl} target="_blank" rel="noopener" className="font-medium text-blue-700 underline">
                Province-wide overview map
              </a>{' '}
              ·{' '}
              <a href={ELECTIONS_ALBERTA.mapsUrl} target="_blank" rel="noopener" className="font-medium text-blue-700 underline">
                All maps on elections.ab.ca
              </a>
            </p>
          </div>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <section className="w-full border-t border-gray-200 py-10 md:py-14">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
              <h2 className="text-2xl font-bold">Ready to apply?</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Applications go through Elections Alberta&apos;s own recruitment system. Boundaries
                for the {ELECTORAL_DIVISIONS.length} divisions have been in effect since March 19, 2019.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={ELECTIONS_ALBERTA.applyUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
                >
                  Apply on Elections Alberta <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={ELECTIONS_ALBERTA.recruitmentInfoUrl}
                  target="_blank"
                  rel="noopener"
                  className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Official role descriptions
                </a>
                <Link
                  href="/jobs"
                  className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Browse other Alberta jobs
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
