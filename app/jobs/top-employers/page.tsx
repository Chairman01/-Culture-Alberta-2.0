import type { Metadata } from 'next'
import Link from 'next/link'
import { getCompaniesWithJobs, getActiveJobCount, JOB_CITY_LABELS } from '@/lib/jobs'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { sectorFor, SECTORS, SECTOR_BLURBS, type EmployerSector } from '../employer-sectors'
import { logoDomainFor, logoSrcFor } from '../shared'
import {
  FORBES_CULTURE_SOURCE, FORBES_CULTURE_TOP_10, FORBES_CULTURE_ALBERTA,
  FORBES_CULTURE_2025_RANK, FORBES_CULTURE_BY_INDUSTRY,
} from './forbes-culture-2026'
import { REFERENCE_SECTIONS } from './reference-data'

/**
 * Top employers: who is hiring most in Alberta right now, by industry, next to
 * how employers rank on the published best-employer lists.
 *
 * The hiring numbers are live, from the job board. The rankings are other
 * people's work and are shown as such: a slice of each list, attributed and
 * linked, with a note on how it was made so a reader knows what a rank means.
 */

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Top Employers in Alberta and Canada by Industry (2026)',
  description:
    'Which Alberta employers are hiring the most right now, by industry, and how Alberta and Canadian employers rank on the 2026 best-employer lists.',
  alternates: { canonical: 'https://www.culturealberta.com/jobs/top-employers' },
  openGraph: {
    title: 'Top Employers in Alberta and Canada by Industry',
    description: 'Who is hiring most in Alberta right now, and how employers rank on the 2026 best-employer lists.',
    type: 'website',
    url: 'https://www.culturealberta.com/jobs/top-employers',
  },
}

/** How a Forbes name is written on the job board, where the two differ. */
const BOARD_NAME: Record<string, string> = {
  'Suncor Energy': 'Suncor',
}

function Section({ id, title, intro, children }: {
  id: string; title: string; intro?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-gray-200 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
      {intro && <p className="mt-2 max-w-3xl text-gray-600">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default async function TopEmployersPage() {
  const [companies, totalJobs] = await Promise.all([getCompaniesWithJobs(), getActiveJobCount()])

  const hiring = companies.map(c => ({
    company: c.company,
    slug: c.slug,
    jobCount: c.jobCount,
    cities: c.cities.map(city => JOB_CITY_LABELS[city]),
    sector: sectorFor(c.company),
    logoDomain: logoDomainFor({ ats_board: c.atsBoard, company: c.company }),
    logoSrc: logoSrcFor({ company: c.company }),
  }))
  const bySlugName = new Map(hiring.map(h => [h.company, h]))
  const onBoard = (name: string) => bySlugName.get(BOARD_NAME[name] ?? name)

  const bySector = SECTORS.map(sector => {
    const employers = hiring.filter(h => h.sector === sector)
    return { sector, employers, jobs: employers.reduce((n, e) => n + e.jobCount, 0) }
  }).filter(s => s.employers.length > 0).sort((a, b) => b.jobs - a.jobs)

  const updated = new Date().toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Edmonton',
  })

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full bg-muted/40 py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <p className="text-sm font-medium text-gray-500">
              <Link href="/jobs" className="hover:underline">Jobs</Link> / Top employers
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tighter sm:text-5xl">
              Top employers in Alberta and Canada, by industry
            </h1>
            <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
              Two ways to answer &ldquo;who is a top employer?&rdquo; Who is hiring the most in Alberta right now,
              counted live from {hiring.length} employers and {totalJobs.toLocaleString()} open jobs on our board. And
              who ranks best on the published employer lists, by industry.
            </p>
            <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
              {[
                ['#hiring-now', 'Hiring the most now'],
                ['#by-industry', 'By industry'],
                ['#alberta-ranked', 'Alberta employers ranked'],
                ['#canada-by-industry', 'Canada by industry'],
                ...REFERENCE_SECTIONS.map(s => [`#${s.id}`, s.navLabel] as const),
                ['#how', 'How the lists are made'],
              ].map(([href, label]) => (
                <a key={href} href={href} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:border-gray-500">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <Section
            id="hiring-now"
            title="Alberta employers hiring the most right now"
            intro={<>The twenty employers with the most open jobs on the Culture Alberta job board, updated {updated}. Counts change daily as postings open and close.</>}
          >
            <ol className="grid gap-3 sm:grid-cols-2">
              {hiring.slice(0, 20).map((e, i) => (
                <li key={e.slug}>
                  <Link
                    href={`/jobs/company/${e.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-gray-400"
                  >
                    <span className="w-6 flex-shrink-0 text-center text-sm font-semibold tabular-nums text-gray-400">{i + 1}</span>
                    <CompanyLogo company={e.company} domain={e.logoDomain} src={e.logoSrc} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-gray-900">{e.company}</span>
                      <span className="block truncate text-xs text-gray-500">{e.sector} · {e.cities.slice(0, 3).join(', ')}{e.cities.length > 3 ? ` +${e.cities.length - 3}` : ''}</span>
                    </span>
                    <span className="flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-blue-800">
                      {e.jobCount.toLocaleString()} jobs
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-gray-500">
              This counts open postings we can read from each employer&apos;s own hiring site. Some large Alberta
              employers, Alberta Health Services among them, do not allow their postings to be listed elsewhere and
              are not counted.
            </p>
          </Section>

          <Section
            id="by-industry"
            title="Who is hiring, by industry"
            intro="Every employer on the board grouped by what the employer does, with the industries that have the most open jobs first."
          >
            <div className="space-y-8">
              {bySector.map(({ sector, employers, jobs }) => (
                <div key={sector}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{sector}</h3>
                    <p className="text-sm text-gray-500">
                      {jobs.toLocaleString()} open {jobs === 1 ? 'job' : 'jobs'} · {employers.length} {employers.length === 1 ? 'employer' : 'employers'}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{SECTOR_BLURBS[sector as EmployerSector]}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {employers.map(e => (
                      <li key={e.slug}>
                        <Link
                          href={`/jobs/company/${e.slug}`}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-gray-400"
                        >
                          <span className="font-medium text-gray-900">{e.company}</span>
                          <span className="tabular-nums text-gray-500">{e.jobCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="alberta-ranked"
            title="Alberta employers on Forbes' 2026 company culture list"
            intro={<>Thirteen of the 200 employers on {FORBES_CULTURE_SOURCE.name} are listed in Alberta. Last year&apos;s rank is shown where the employer was on the 2025 list.</>}
          >
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">2026 rank</th>
                    <th className="px-4 py-3 font-semibold">Employer</th>
                    <th className="px-4 py-3 font-semibold">Industry</th>
                    <th className="px-4 py-3 font-semibold">2025 rank</th>
                    <th className="px-4 py-3 font-semibold">Open jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {FORBES_CULTURE_ALBERTA.map(e => {
                    const board = onBoard(e.name)
                    const last = FORBES_CULTURE_2025_RANK[e.name]
                    return (
                      <tr key={e.name}>
                        <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">{e.rank}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{e.name}</span>
                          <span className="block text-xs text-gray-500">{e.city}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.industry}</td>
                        <td className="px-4 py-3 tabular-nums text-gray-600">{last ?? 'Not listed'}</td>
                        <td className="px-4 py-3">
                          {board ? (
                            <Link href={`/jobs/company/${board.slug}`} className="font-medium text-blue-700 hover:underline">
                              {board.jobCount} open
                            </Link>
                          ) : (
                            <span className="text-gray-400">Not on our board</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Cities are as Forbes lists them. Rogers Communications is listed under Calgary.
            </p>
          </Section>

          <Section
            id="canada-by-industry"
            title="Canada's top-ranked employers for company culture, by industry"
            intro={<>The national top ten, then the three highest-ranked employers in each industry on the same Forbes list. The number in brackets is how many of the 200 employers are in that industry.</>}
          >
            <h3 className="text-lg font-semibold text-gray-900">The national top ten</h3>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {FORBES_CULTURE_TOP_10.map(e => (
                <li key={e.name} className="flex items-baseline gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="w-6 flex-shrink-0 font-semibold tabular-nums text-gray-900">{e.rank}</span>
                  <span className="min-w-0">
                    <span className="font-medium text-gray-900">{e.name}</span>
                    <span className="block text-xs text-gray-500">{[e.city, e.province].filter(Boolean).join(', ')} · {e.industry}</span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-8 text-lg font-semibold text-gray-900">Top three in each industry</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {FORBES_CULTURE_BY_INDUSTRY.map(group => (
                <div key={group.industry} className="rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="font-semibold text-gray-900">
                    {group.industry} <span className="font-normal text-gray-400">({group.count})</span>
                  </h4>
                  <ol className="mt-2 space-y-1.5 text-sm">
                    {group.top.map(e => (
                      <li key={e.name} className="flex gap-2">
                        <span className="w-8 flex-shrink-0 tabular-nums text-gray-500">#{e.rank}</span>
                        <span className="min-w-0 text-gray-800">
                          {e.name}
                          {e.province === 'Alberta' && (
                            <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-800">Alberta</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Source: <a href={FORBES_CULTURE_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">{FORBES_CULTURE_SOURCE.name}</a>, published {FORBES_CULTURE_SOURCE.published}. The full ranking of all {FORBES_CULTURE_SOURCE.size} employers is on Forbes.
            </p>
          </Section>

          {REFERENCE_SECTIONS.map(section => (
            <Section key={section.id} id={section.id} title={section.title} intro={section.intro}>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>{section.columns.map(c => <th key={c} className="px-4 py-3 font-semibold">{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {section.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {typeof cell === 'string' ? cell : (
                              <a href={cell.href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">{cell.text}</a>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {section.note && <>{section.note} </>}
                Source:{' '}
                {section.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && '; '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">{s.label}</a>
                  </span>
                ))}.
              </p>
            </Section>
          ))}

          <Section id="how" title="How these lists are made, and what they don't tell you">
            <div className="max-w-3xl space-y-4 text-gray-700">
              <p>
                <strong>The hiring counts</strong> are ours. Each morning and afternoon we read the open postings on
                each employer&apos;s own hiring site and count them. A high count means an employer is recruiting a lot
                right now. It says nothing about what it is like to work there.
              </p>
              <p>
                <strong>The Forbes company culture list</strong> is a survey. Forbes and the research firm Statista
                asked more than 37,000 people working in Canada, at organizations with at least 500 employees here,
                whether they would recommend their employer and how they rate its culture. The 200 highest-scoring
                employers make the list. The broader Best Employers list is built the same way, asks about pay,
                flexibility and training as well, and keeps the top 300. It measures how surveyed employees feel. It does not compare pay, benefits,
                job security or turnover.
              </p>
              <p>
                A rank can move a long way in a year without one clear cause, and an employer missing from a list was
                not necessarily rated badly. It may not have had enough survey responses, or may be too small to
                qualify. Treat a ranking as a starting point and read the posting, the pay and the team for yourself.
              </p>
            </div>
            <Link
              href="/jobs"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Browse all Alberta jobs
            </Link>
          </Section>
        </div>
      </main>
    </div>
  )
}
