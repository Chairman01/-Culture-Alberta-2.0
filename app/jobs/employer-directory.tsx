'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { SECTORS, SECTOR_BLURBS, SECTOR_CHIP_LABELS, type EmployerSector } from './employer-sectors'

/**
 * "Browse by employer", grouped by industry and filterable by city.
 *
 * Everything renders on the server on first paint — no filter is applied until
 * the reader touches one — so all 43 company links stay in the initial HTML.
 * That matters more than the UI: these links are the only crawl path to
 * /jobs/company/[slug], which is otherwise reachable only from a single
 * posting.
 *
 * Filtering is local state, not the URL. The list is a directory the reader
 * scans for a few seconds on their way somewhere else; pushing each chip
 * through the router would refetch the whole server component and cost an
 * on-demand render for a purely visual change.
 */

export interface DirectoryEmployer {
  company: string
  slug: string
  jobCount: number
  /** Display labels, e.g. ["Calgary", "Red Deer"]. */
  cities: string[]
  /** Open roles per city label, so counts stay true under a city filter. */
  cityCounts: Record<string, number>
  sector: EmployerSector
  logoDomain?: string
  logoSrc?: string
}

const ALL = 'all'

export default function EmployerDirectory({ employers }: { employers: DirectoryEmployer[] }) {
  const [city, setCity] = useState<string>(ALL)
  const [sector, setSector] = useState<string>(ALL)
  const [query, setQuery] = useState('')

  /** Cities present on the board, biggest first, with the employer count. */
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of employers) {
      for (const c of e.cities) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [employers])

  /**
   * Sector chips, counted against the city filter but not the sector filter —
   * a chip that reads "(0)" once you have selected another sector is useless,
   * and one that hides itself makes the row jump under the cursor.
   */
  const sectorOptions = useMemo(() => {
    const inCity = city === ALL ? employers : employers.filter(e => e.cities.includes(city))
    const counts = new Map<string, number>()
    for (const e of inCity) counts.set(e.sector, (counts.get(e.sector) ?? 0) + 1)
    return SECTORS.filter(s => counts.has(s)).map(s => [s, counts.get(s)!] as const)
  }, [employers, city])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employers.filter(e => {
      if (city !== ALL && !e.cities.includes(city)) return false
      if (sector !== ALL && e.sector !== sector) return false
      if (q && !e.company.toLowerCase().includes(q)) return false
      return true
    })
  }, [employers, city, sector, query])

  /** Groups in taxonomy order, each sorted by the count actually on show. */
  const groups = useMemo(() => {
    return SECTORS.map(s => {
      const members = filtered
        .filter(e => e.sector === s)
        .map(e => ({ ...e, shown: city === ALL ? e.jobCount : (e.cityCounts[city] ?? 0) }))
        .sort((a, b) => b.shown - a.shown || a.company.localeCompare(b.company))
      return {
        sector: s,
        members,
        roles: members.reduce((n, e) => n + e.shown, 0),
      }
    }).filter(g => g.members.length > 0)
  }, [filtered, city])

  const totalRoles = groups.reduce((n, g) => n + g.roles, 0)
  const isFiltered = city !== ALL || sector !== ALL || query.trim() !== ''

  function clearAll() {
    setCity(ALL)
    setSector(ALL)
    setQuery('')
  }

  const where = city === ALL ? 'Alberta' : city

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-xl font-semibold">Browse by employer</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered.length} {city === ALL ? 'Alberta' : city} employer{filtered.length === 1 ? '' : 's'} hiring
        right now{totalRoles > 0 && <> · {totalRoles.toLocaleString()} open role{totalRoles === 1 ? '' : 's'}</>}.
        Pick an industry or a city to narrow it down.
      </p>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mt-5 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search employers by name…"
            aria-label="Search employers by name"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <FilterRow
          label="City"
          options={[
            { value: ALL, count: employers.length, label: 'All of Alberta' },
            ...cityOptions.map(([c, n]) => ({ value: c, count: n, label: c })),
          ]}
          value={city}
          onChange={next => {
            setCity(next)
            // A sector can be empty in the newly chosen city, which would show
            // an empty directory with no obvious cause. Drop back to all.
            if (next !== ALL && sector !== ALL) {
              const stillThere = employers.some(e => e.sector === sector && e.cities.includes(next))
              if (!stillThere) setSector(ALL)
            }
          }}
        />

        <FilterRow
          label="Industry"
          options={[
            { value: ALL, count: countInCity(employers, city), label: 'All industries' },
            ...sectorOptions.map(([s, n]) => ({ value: s, count: n, label: SECTOR_CHIP_LABELS[s] })),
          ]}
          value={sector}
          onChange={setSector}
        />

        {isFiltered && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Grouped employers ───────────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
          <p className="font-medium text-gray-900">No employers match those filters.</p>
          <p className="mt-1 text-sm text-gray-600">
            Try a different city or industry.{' '}
            <button type="button" onClick={clearAll} className="font-medium text-blue-700 underline">
              Clear filters
            </button>
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map(group => (
            <section key={group.sector} aria-labelledby={`sector-${slugify(group.sector)}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3
                  id={`sector-${slugify(group.sector)}`}
                  className="text-base font-semibold text-gray-900"
                >
                  {group.sector}
                </h3>
                <span className="text-sm text-gray-500">
                  {group.members.length} employer{group.members.length === 1 ? '' : 's'} ·{' '}
                  {group.roles.toLocaleString()} role{group.roles === 1 ? '' : 's'}
                  {city !== ALL && ` in ${city}`}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{SECTOR_BLURBS[group.sector]}</p>

              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.members.map(e => (
                  // min-w-0 because a grid track floors at its content's
                  // min-content width: the Government of Alberta card lists
                  // seven cities, which stretched every card in that group 24px
                  // past the container at 375px.
                  <li key={e.slug} className="min-w-0">
                    <Link
                      href={`/jobs/company/${e.slug}`}
                      className="flex h-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <CompanyLogo
                        company={e.company}
                        domain={e.logoDomain}
                        src={e.logoSrc}
                        size={40}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-900">{e.company}</span>
                        <span className="block truncate text-sm text-gray-500" title={e.cities.join(', ')}>
                          {e.shown} open role{e.shown === 1 ? '' : 's'} ·{' '}
                          {city === ALL ? placesLabel(e.cities) : city}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Not seeing your industry? The board carries employers who publish their own openings, so it
        grows as more Alberta companies do. Every listing links straight to the employer&apos;s
        careers site.
      </p>
      <span className="sr-only">Employer directory for jobs in {where}.</span>
    </div>
  )
}

/**
 * Cities on a card. Past three the full list stops being scannable and starts
 * being a paragraph — Elections Alberta hires in all seven — so it collapses to
 * a count, with the names kept on the title attribute.
 */
function placesLabel(cities: string[]): string {
  if (cities.length <= 3) return cities.join(', ')
  return `${cities.length} cities`
}

/** Employers visible under the city filter alone — the count for "All industries". */
function countInCity(employers: DirectoryEmployer[], city: string): number {
  if (city === ALL) return employers.length
  return employers.filter(e => e.cities.includes(city)).length
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface FilterOption {
  value: string
  count: number
  /** What the chip reads; differs from `value` for the abbreviated sectors. */
  label: string
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly FilterOption[]
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      {/* Below sm the chips are a single swipeable strip, so the label has to
          sit outside it or it scrolls away with them. */}
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
        {label}
      </span>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
        <span className="mr-1 hidden w-16 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:block">
          {label}
        </span>
        {options.map(o => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-sm transition-colors sm:py-1.5 ${
                active
                  ? 'border-blue-600 bg-blue-600 font-medium text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {o.label}
              <span className={active ? 'ml-1.5 text-blue-100' : 'ml-1.5 text-gray-400'}>{o.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
