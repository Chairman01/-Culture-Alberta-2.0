'use client'

import { JobForm, EMPTY_JOB_FORM } from '../job-form'

export default function NewJobPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">New job posting</h1>
      <JobForm initial={EMPTY_JOB_FORM} />
    </div>
  )
}
