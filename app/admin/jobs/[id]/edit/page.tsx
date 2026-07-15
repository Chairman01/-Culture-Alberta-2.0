'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { JobForm, EMPTY_JOB_FORM, type JobFormValues } from '../../job-form'

export default function EditJobPage() {
  const params = useParams<{ id: string }>()
  const [initial, setInitial] = useState<JobFormValues | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        const j = data.job
        if (!active) return
        setInitial({
          ...EMPTY_JOB_FORM,
          title: j.title || '',
          company: j.company || '',
          city: j.city || 'calgary',
          category: j.category || '',
          location_raw: j.location_raw || '',
          description_html: j.description_html || '',
          salary_min: j.salary_min != null ? String(j.salary_min) : '',
          salary_max: j.salary_max != null ? String(j.salary_max) : '',
          employment_type: j.employment_type || '',
          apply_url: j.apply_url || '',
          posted_at: j.posted_at ? j.posted_at.slice(0, 10) : '',
          valid_through: j.valid_through ? j.valid_through.slice(0, 10) : '',
          status: j.status || 'active',
          is_featured: !!j.is_featured,
        })
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load job')
      }
    })()
    return () => { active = false }
  }, [params.id])

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Edit job posting</h1>
      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : initial === null ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <JobForm initial={initial} jobId={params.id} />
      )}
    </div>
  )
}
