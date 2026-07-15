'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Admin jobs list — manual postings first, then aggregated ones.
 * Also hosts the manual triggers for the daily sync and the weekly article.
 */

interface AdminJobRow {
  id: string
  title: string
  slug: string
  company: string
  city: string
  category: string | null
  status: string
  source: string
  is_manual: boolean
  is_featured: boolean
  posted_at: string | null
  valid_through: string | null
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJobRow[] | null>(null)
  const [filter, setFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/jobs')
      const data = await res.json()
      setJobs(res.ok ? data.jobs : [])
    } catch {
      setJobs([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (id: string) => {
    if (!confirm('Delete this job posting?')) return
    setBusy(id)
    try {
      await fetch(`/api/admin/jobs?id=${id}`, { method: 'DELETE' })
      setJobs(prev => (prev || []).filter(j => j.id !== id))
    } finally {
      setBusy(null)
    }
  }

  const runSync = async () => {
    setBusy('sync')
    setMessage(null)
    try {
      const res = await fetch('/api/admin/automation/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'all' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const totals = (data.results || []).map((r: any) =>
        `${r.city}: +${r.inserted} new, ${r.updated} updated, ${r.blocked} blocked, ${r.expiredStale + r.expiredPastDue} expired`
      ).join(' · ')
      setMessage(`Sync complete. ${totals}`)
      load()
    } catch (err) {
      setMessage(`Sync failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(null)
    }
  }

  const runWeeklyArticle = async () => {
    setBusy('article')
    setMessage(null)
    try {
      const res = await fetch('/api/admin/automation/weekly-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'all', status: 'draft' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const lines = (data.results || []).map((r: any) =>
        r.success ? `${r.cityLabel}: draft "${r.title}"` : `${r.cityLabel}: ${r.error}`
      ).join(' · ')
      setMessage(`Weekly article run: ${lines}`)
    } catch (err) {
      setMessage(`Article generation failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(null)
    }
  }

  const filtered = (jobs || []).filter(j => {
    if (sourceFilter !== 'all' && j.source !== sourceFilter) return false
    if (filter) {
      const f = filter.toLowerCase()
      if (!`${j.title} ${j.company} ${j.city}`.toLowerCase().includes(f)) return false
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runSync}
            disabled={busy !== null}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'sync' ? 'Syncing…' : 'Run Adzuna sync'}
          </button>
          <button
            onClick={runWeeklyArticle}
            disabled={busy !== null}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'article' ? 'Generating…' : 'Generate weekly article (draft)'}
          </button>
          <Link
            href="/admin/jobs/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New job
          </Link>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-900">{message}</p>
      )}

      <div className="mb-4 flex gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search title, company..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="all">All sources</option>
          <option value="manual">Manual</option>
          <option value="adzuna">Adzuna</option>
        </select>
      </div>

      {jobs === null ? (
        <p className="py-12 text-center text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No jobs found. Run the Adzuna sync or create a manual posting.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Company</th>
                <th className="px-3 py-2 font-semibold">City</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Valid through</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(j => (
                <tr key={j.id} className="border-t">
                  <td className="px-3 py-2">
                    <a href={`/jobs/posting/${j.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 hover:underline">
                      {j.title}
                    </a>
                    {j.is_featured && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">Featured</span>}
                  </td>
                  <td className="px-3 py-2">{j.company}</td>
                  <td className="px-3 py-2 capitalize">{j.city}</td>
                  <td className="px-3 py-2 capitalize">{j.source}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      j.status === 'active' ? 'bg-green-100 text-green-800'
                      : j.status === 'draft' ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-200 text-gray-600'
                    }`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {j.valid_through ? j.valid_through.slice(0, 10) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {j.is_manual && (
                      <Link href={`/admin/jobs/${j.id}/edit`} className="mr-3 text-blue-600 hover:underline">Edit</Link>
                    )}
                    <button
                      onClick={() => remove(j.id)}
                      disabled={busy === j.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
