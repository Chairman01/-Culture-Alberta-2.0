'use client'

import { useMemo, useState } from 'react'
import { MapPin, Search, ExternalLink } from 'lucide-react'
import {
  ELECTORAL_DIVISIONS,
  divisionMapUrl,
  findMunicipalities,
  ELECTIONS_ALBERTA,
  type EdRegion,
} from '@/lib/elections-alberta'

/**
 * Find-your-division search across all 87 electoral divisions.
 *
 * Searches municipalities as well as division names, because that is how people
 * actually describe where they live: someone in Okotoks does not know their
 * division is called "Highwood", and typing their own town used to return
 * nothing. Municipality matches take priority and are announced explicitly, so
 * the reader can see the reasoning rather than trusting a filtered list.
 */

const REGIONS: Array<EdRegion | 'All'> = ['All', 'Calgary', 'Edmonton', 'Rest of Alberta']

/** The seven municipalities the jobs board covers — one tap instead of typing. */
const QUICK_PICKS = [
  'Calgary', 'Edmonton', 'Red Deer', 'Lethbridge',
  'Medicine Hat', 'Grande Prairie', 'Fort McMurray',
]

export function DivisionFinder() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<EdRegion | 'All'>('All')

  const { results, municipality } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byRegion = ELECTORAL_DIVISIONS.filter(d => region === 'All' || d.region === region)
    if (!q) return { results: byRegion, municipality: null }

    // A municipality match is the confident answer — show exactly its divisions.
    const muni = findMunicipalities(q)[0]
    if (muni) {
      const divs = byRegion.filter(d => muni.divisions.includes(d.number))
      if (divs.length > 0) return { results: divs, municipality: muni }
    }

    return {
      results: byRegion.filter(
        d => d.name.toLowerCase().includes(q) || String(d.number) === q
      ),
      municipality: null,
    }
  }, [query, region])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter your city or town — Okotoks, Red Deer, Canmore…"
            aria-label="Search by municipality or electoral division"
            className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={region}
          onChange={e => setRegion(e.target.value as EdRegion | 'All')}
          aria-label="Filter by region"
          className="rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          {REGIONS.map(r => (
            <option key={r} value={r}>{r === 'All' ? 'All of Alberta' : r}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Jump to:</span>
        {QUICK_PICKS.map(place => (
          <button
            key={place}
            type="button"
            onClick={() => { setQuery(place); setRegion('All') }}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              query.trim().toLowerCase() === place.toLowerCase()
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {place}
          </button>
        ))}
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-sm font-medium text-blue-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {municipality && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" aria-live="polite">
          <strong>{municipality.name}</strong> is covered by{' '}
          {municipality.divisions.length === 1
            ? '1 electoral division'
            : `${municipality.divisions.length} electoral divisions`}
          . Elections Alberta staffs each one separately, so any of these counts as work near you.
        </p>
      )}

      <p className="mt-3 text-sm text-gray-600" aria-live="polite">
        Showing {results.length} of {ELECTORAL_DIVISIONS.length} electoral divisions
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
          <p>No match for “{query}”.</p>
          <p className="mt-2 text-sm">
            Smaller communities aren&apos;t all listed by name — try the nearest town, or{' '}
            <a href={ELECTIONS_ALBERTA.overviewMapUrl} target="_blank" rel="noopener" className="font-medium text-blue-700 underline">
              open the province-wide map
            </a>{' '}
            to find the division you live in.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(d => (
            <li key={d.number} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-600">
                  {d.number}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.region}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={ELECTIONS_ALBERTA.applyUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Apply here
                </a>
                <a
                  href={divisionMapUrl(d)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <MapPin className="h-3.5 w-3.5" /> Boundary map
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
