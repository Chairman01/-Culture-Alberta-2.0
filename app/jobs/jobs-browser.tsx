"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

/**
 * Client-side jobs browser — filter/paginate over the full server-fetched
 * list, mirroring app/events/events-browser.tsx.
 */

export interface BrowserJob {
  id: string
  slug: string
  title: string
  company: string
  city: 'Calgary' | 'Edmonton'
  category: string
  salaryText?: string
  postedAt?: string       // ISO — for the posted-within filter
  postedLabel?: string    // "July 12, 2026"
  employmentType?: string // "Full-time" etc.
  snippet?: string
  featured?: boolean
  manual?: boolean
}

const PAGE_SIZE = 12

const BADGE_COLORS: Array<{ match: RegExp; classes: string }> = [
  { match: /health|nursing|care/i, classes: 'bg-red-700 text-white' },
  { match: /it\b|software|engineering/i, classes: 'bg-blue-700 text-white' },
  { match: /trade|construction|maintenance/i, classes: 'bg-amber-700 text-white' },
  { match: /teach|education/i, classes: 'bg-purple-700 text-white' },
  { match: /account|finance|legal/i, classes: 'bg-teal-700 text-white' },
  { match: /logistics|warehouse|driving/i, classes: 'bg-orange-600 text-white' },
  { match: /hospitality|catering|retail/i, classes: 'bg-emerald-700 text-white' },
]

function badgeClass(category: string): string {
  return BADGE_COLORS.find(b => b.match.test(category))?.classes || 'bg-gray-600 text-white'
}

const POSTED_WITHIN_OPTIONS = [
  { value: 'all', label: 'Any time', days: 0 },
  { value: '1', label: 'Last 24 hours', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '14', label: 'Last 14 days', days: 14 },
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

  const categories = useMemo(
    () => [...new Set(jobs.map(j => j.category).filter(Boolean))].sort(),
    [jobs]
  )

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

  const resetPage = () => setPage(1)

  return (
    <div>
      {/* Filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label htmlFor="job-keyword" className="block text-sm font-semibold text-gray-800 mb-1">Search By Keyword</label>
          <div className="relative">
            <input
              id="job-keyword"
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); resetPage() }}
              placeholder="Job title, company..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:border-blue-500 focus:outline-none"
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div>
          <label htmlFor="job-city" className="block text-sm font-semibold text-gray-800 mb-1">City</label>
          <select
            id="job-city"
            value={city}
            onChange={e => { setCity(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Edmonton &amp; Calgary</option>
            <option value="Edmonton">Edmonton</option>
            <option value="Calgary">Calgary</option>
          </select>
        </div>
        <div>
          <label htmlFor="job-category" className="block text-sm font-semibold text-gray-800 mb-1">Category</label>
          <select
            id="job-category"
            value={category}
            onChange={e => { setCategory(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="job-posted" className="block text-sm font-semibold text-gray-800 mb-1">Posted Within</label>
          <select
            id="job-posted"
            value={postedWithin}
            onChange={e => { setPostedWithin(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            {POSTED_WITHIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label htmlFor="job-salary" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
            <input
              id="job-salary"
              type="checkbox"
              checked={hasSalary}
              onChange={e => { setHasSalary(e.target.checked); resetPage() }}
              className="h-4 w-4 rounded border-gray-300"
            />
            With salary info
          </label>
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {showingFrom}-{showingTo} Jobs out of {filtered.length} Jobs
      </p>

      {/* Card grid */}
      {pageJobs.length === 0 ? (
        <p className="py-16 text-center text-gray-500">
          No jobs match your filters. Try clearing the keyword or widening the categories.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageJobs.map(job => (
            <div key={job.id} className="flex flex-col rounded-md border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold leading-snug mb-1">
                <Link
                  href={`/jobs/posting/${job.slug}`}
                  className="text-blue-700 hover:text-blue-900 hover:underline"
                >
                  {job.title}
                </Link>
              </h3>
              <p className="text-sm font-medium text-gray-700 mb-2 border-b border-blue-400 pb-3">{job.company}</p>
              {job.salaryText && (
                <p className="text-sm text-gray-800 mb-1"><strong>Salary:</strong> {job.salaryText}</p>
              )}
              {job.postedLabel && (
                <p className="text-sm text-gray-800 mb-1"><strong>Posted:</strong> {job.postedLabel}</p>
              )}
              {job.snippet && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{job.snippet}</p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {job.featured && (
                  <span className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                    Featured
                  </span>
                )}
                <span className={`rounded px-2.5 py-1 text-xs font-semibold ${badgeClass(job.category)}`}>
                  {job.category}
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{job.city}</span>
                {job.employmentType && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{job.employmentType}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">Page {safePage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
