"use client"

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, X, Building2, ExternalLink } from 'lucide-react'

/**
 * Client-side jobs browser — Indeed-style list + detail.
 *
 * Left column is a compact scannable list; selecting a row shows the full
 * summary in a sticky panel on the right. Below the lg breakpoint the panel is
 * dropped and each row simply navigates to its posting page.
 *
 * Every row stays a real <a href="/jobs/posting/…"> so crawlers still reach each
 * posting; on desktop the click is intercepted to fill the panel instead.
 */

export interface BrowserJob {
  id: string
  slug: string
  title: string
  company: string
  city: 'Calgary' | 'Edmonton'
  category: string
  salaryText?: string
  postedAt?: string       // ISO — for the posted-within filter + New badge
  postedLabel?: string    // "July 12, 2026"
  employmentType?: string // "Full-time" etc.
  snippet?: string
  featured?: boolean
  manual?: boolean
}

const PAGE_SIZE = 20
const NEW_WITHIN_MS = 48 * 60 * 60 * 1000

const POSTED_WITHIN_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
] as const

export default function JobsBrowser({
  jobs,
  initialCity = 'all',
}: {
  jobs: BrowserJob[]
  initialCity?: string
}) {
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState(initialCity)
  const [category, setCategory] = useState('all')
  const [postedWithin, setPostedWithin] = useState('all')
  const [hasSalary, setHasSalary] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Top categories with counts, for the quick-filter chips
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of jobs) {
      if (j.category) counts.set(j.category, (counts.get(j.category) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [jobs])

  const filtersActive =
    keyword.trim() !== '' || city !== initialCity || category !== 'all' ||
    postedWithin !== 'all' || hasSalary

  const clearFilters = () => {
    setKeyword('')
    setCity(initialCity)
    setCategory('all')
    setPostedWithin('all')
    setHasSalary(false)
    setPage(1)
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const cutoff =
      postedWithin === 'all'
        ? null
        : Date.now() - Number(postedWithin) * 24 * 60 * 60 * 1000

    const matches = jobs.filter(j => {
      if (city !== 'all' && j.city !== city) return false
      if (category !== 'all' && j.category !== category) return false
      if (hasSalary && !j.salaryText) return false
      if (cutoff && (!j.postedAt || new Date(j.postedAt).getTime() < cutoff)) return false
      if (kw) {
        const haystack = `${j.title} ${j.company} ${j.category} ${j.city}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })

    // Featured/manual postings pinned first, then newest first
    const rank = (j: BrowserJob) => (j.featured ? 0 : j.manual ? 1 : 2)
    return matches.sort((a, b) => {
      const r = rank(a) - rank(b)
      if (r !== 0) return r
      return (b.postedAt || '').localeCompare(a.postedAt || '')
    })
  }, [jobs, keyword, city, category, postedWithin, hasSalary])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageJobs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length)

  // Falling back to the first row (rather than setting state in an effect) keeps
  // the panel present in the server-rendered HTML and avoids a first-paint flash.
  // A stale selectedId after filtering simply falls back to the first result.
  const selected = pageJobs.find(j => j.id === selectedId) || pageJobs[0] || null

  const resetPage = () => setPage(1)
  const isNew = (j: BrowserJob) =>
    j.postedAt && Date.now() - new Date(j.postedAt).getTime() < NEW_WITHIN_MS

  // Selecting a row fills the detail panel rather than navigating. Modified
  // clicks (new tab/window) are left alone, and the row stays a real anchor so
  // crawlers still reach every posting page.
  const onRowClick = useCallback((e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    setSelectedId(id)
    if (typeof document !== 'undefined') {
      // On narrow screens the panel sits below the list, so bring it into view.
      if (window.matchMedia('(max-width: 1023px)').matches) {
        document.getElementById('job-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])

  return (
    <div>
      {/* Prominent search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={keyword}
          onChange={e => { setKeyword(e.target.value); resetPage() }}
          placeholder="Search job title, company, or keyword…"
          aria-label="Search jobs"
          className="w-full rounded-xl border-2 border-gray-200 py-3.5 pl-12 pr-4 text-base shadow-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={city}
          onChange={e => { setCity(e.target.value); resetPage() }}
          aria-label="City"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All of Alberta</option>
          <option value="Calgary">Calgary</option>
          <option value="Edmonton">Edmonton</option>
        </select>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); resetPage() }}
          aria-label="Category"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All categories</option>
          {categoryCounts.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <select
          value={postedWithin}
          onChange={e => { setPostedWithin(e.target.value); resetPage() }}
          aria-label="Posted within"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {POSTED_WITHIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={hasSalary}
            onChange={e => { setHasSalary(e.target.checked); resetPage() }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Pay listed
        </label>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Quick category chips */}
      {categoryCounts.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {categoryCounts.slice(0, 8).map(([c, n]) => (
            <button
              key={c}
              type="button"
              onClick={() => { setCategory(category === c ? 'all' : c); resetPage() }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              {c} · {n}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      <p className="mb-4 text-sm text-gray-600">
        {filtered.length === jobs.length
          ? `${jobs.length} open ${jobs.length === 1 ? 'job' : 'jobs'} in Alberta`
          : `Showing ${showingFrom}-${showingTo} of ${filtered.length} matching jobs`}
      </p>

      {/* List + detail / empty states */}
      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold text-gray-700">New jobs are being added</p>
          <p className="mt-2 text-sm text-gray-500">
            The board updates daily with new Calgary and Edmonton openings. Check back soon.
          </p>
        </div>
      ) : pageJobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-600">No jobs match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6 lg:items-start">
          {/* ── Left: scannable list ─────────────────────────────── */}
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {pageJobs.map(job => {
              const active = selected?.id === job.id
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/posting/${job.slug}`}
                    onClick={e => onRowClick(e, job.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`block border-l-4 px-4 py-4 transition-colors ${
                      active
                        ? 'border-l-blue-600 bg-blue-50/70'
                        : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-base font-semibold leading-snug ${active ? 'text-blue-800' : 'text-gray-900'}`}>
                        {job.title}
                      </h3>
                      {job.featured ? (
                        <span className="mt-0.5 flex-shrink-0 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Featured
                        </span>
                      ) : isNew(job) ? (
                        <span className="mt-0.5 flex-shrink-0 rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                          New
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-sm text-gray-700">{job.company}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.city}
                      </span>
                      {job.postedLabel && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {job.postedLabel}
                        </span>
                      )}
                      {job.employmentType && <span>{job.employmentType}</span>}
                    </div>

                    {job.salaryText && (
                      <p className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {job.salaryText}
                      </p>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* ── Right: detail panel (below the list on mobile) ───── */}
          {selected && (
            <aside id="job-detail-panel" className="mt-6 lg:mt-0 lg:sticky lg:top-24">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold leading-tight text-gray-900">{selected.title}</h2>

                <p className="mt-1 inline-flex items-center gap-1.5 text-base text-gray-700">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {selected.company}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" /> {selected.city}
                  </span>
                  {selected.postedLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" /> Posted {selected.postedLabel}
                    </span>
                  )}
                </div>

                {selected.salaryText && (
                  <p className="mt-4">
                    <span className="rounded bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                      {selected.salaryText}
                    </span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{selected.category}</span>
                  {selected.employmentType && (
                    <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{selected.employmentType}</span>
                  )}
                </div>

                {selected.snippet && (
                  <p className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                    {selected.snippet}
                  </p>
                )}

                <Link
                  href={`/jobs/posting/${selected.slug}`}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  View full posting &amp; apply
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <p className="mt-3 text-center text-xs text-gray-500">
                  You apply on the employer&apos;s own site.
                </p>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => { setPage(p => Math.max(1, p - 1)); setSelectedId(null) }}
            disabled={safePage <= 1}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">Page {safePage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSelectedId(null) }}
            disabled={safePage >= totalPages}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
