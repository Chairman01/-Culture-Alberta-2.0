'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Shared create/edit form for manual job postings.
 * A full HTML description makes the posting eligible for Google's
 * JobPosting rich results, so encourage filling it in.
 */

export interface JobFormValues {
  title: string
  company: string
  city: string
  category: string
  location_raw: string
  description_html: string
  salary_min: string
  salary_max: string
  employment_type: string
  apply_url: string
  posted_at: string       // yyyy-mm-dd
  valid_through: string   // yyyy-mm-dd
  status: string
  is_featured: boolean
}

export const EMPTY_JOB_FORM: JobFormValues = {
  title: '',
  company: '',
  city: 'calgary',
  category: '',
  location_raw: '',
  description_html: '',
  salary_min: '',
  salary_max: '',
  employment_type: '',
  apply_url: '',
  posted_at: new Date().toISOString().slice(0, 10),
  valid_through: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: 'active',
  is_featured: false,
}

function toPayload(v: JobFormValues) {
  return {
    title: v.title,
    company: v.company,
    city: v.city,
    category: v.category || null,
    location_raw: v.location_raw || null,
    description_html: v.description_html || null,
    // Plain-text snippet derived from the HTML for cards/meta descriptions
    description_snippet: v.description_html
      ? v.description_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      : null,
    salary_min: v.salary_min ? Number(v.salary_min) : null,
    salary_max: v.salary_max ? Number(v.salary_max) : null,
    employment_type: v.employment_type || null,
    apply_url: v.apply_url,
    posted_at: v.posted_at ? new Date(`${v.posted_at}T12:00:00Z`).toISOString() : null,
    valid_through: v.valid_through ? new Date(`${v.valid_through}T23:59:59Z`).toISOString() : null,
    status: v.status,
    is_featured: v.is_featured,
  }
}

export function JobForm({
  initial,
  jobId,
}: {
  initial: JobFormValues
  jobId?: string   // present = edit mode
}) {
  const router = useRouter()
  const [values, setValues] = useState<JobFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.title || !values.company || !values.apply_url || !values.valid_through) {
      setError('Title, company, apply URL and valid-through date are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(jobId ? `/api/admin/jobs/${jobId}` : '/api/admin/jobs/create', {
        method: jobId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(values)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      router.push('/admin/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  const input = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
  const label = 'block text-sm font-semibold text-gray-800 mb-1'

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className={label}>Job title *</label>
        <input className={input} value={values.title} onChange={e => set('title', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Company *</label>
          <input className={input} value={values.company} onChange={e => set('company', e.target.value)} />
        </div>
        <div>
          <label className={label}>City *</label>
          <select className={input} value={values.city} onChange={e => set('city', e.target.value)}>
            <option value="calgary">Calgary</option>
            <option value="edmonton">Edmonton</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Category</label>
          <input className={input} placeholder="e.g. Healthcare & Nursing" value={values.category} onChange={e => set('category', e.target.value)} />
        </div>
        <div>
          <label className={label}>Location / address</label>
          <input className={input} placeholder="e.g. Downtown Calgary" value={values.location_raw} onChange={e => set('location_raw', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={label}>Full description (HTML)</label>
        <textarea
          className={`${input} min-h-[220px] font-mono`}
          value={values.description_html}
          onChange={e => set('description_html', e.target.value)}
          placeholder="<p>Full job description...</p>"
        />
        <p className="mt-1 text-xs text-gray-500">
          A complete description makes this posting eligible for Google&apos;s job rich results.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={label}>Salary min (CAD)</label>
          <input className={input} type="number" min="0" value={values.salary_min} onChange={e => set('salary_min', e.target.value)} />
        </div>
        <div>
          <label className={label}>Salary max (CAD)</label>
          <input className={input} type="number" min="0" value={values.salary_max} onChange={e => set('salary_max', e.target.value)} />
        </div>
        <div>
          <label className={label}>Type</label>
          <select className={input} value={values.employment_type} onChange={e => set('employment_type', e.target.value)}>
            <option value="">Not specified</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="INTERN">Internship</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Apply URL * (employer&apos;s application page)</label>
        <input className={input} type="url" placeholder="https://..." value={values.apply_url} onChange={e => set('apply_url', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={label}>Posted date</label>
          <input className={input} type="date" value={values.posted_at} onChange={e => set('posted_at', e.target.value)} />
        </div>
        <div>
          <label className={label}>Valid through *</label>
          <input className={input} type="date" value={values.valid_through} onChange={e => set('valid_through', e.target.value)} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select className={input} value={values.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          checked={values.is_featured}
          onChange={e => set('is_featured', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Featured (pinned first on the jobs board)
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : jobId ? 'Save changes' : 'Create job'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/jobs')}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
