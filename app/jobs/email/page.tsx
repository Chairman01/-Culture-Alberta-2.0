import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JobsEmailSettings } from './settings'

export const metadata: Metadata = {
  title: 'Jobs email settings',
  description: 'Choose how often Culture Alberta emails you new jobs.',
  robots: 'noindex',
}

export default function JobsEmailPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <JobsEmailSettings />
        </Suspense>
      </div>
    </div>
  )
}
