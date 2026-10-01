import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConfirmJobsEmail } from './confirm'

export const metadata: Metadata = {
  title: 'Confirm your jobs email',
  robots: 'noindex',
}

export default function ConfirmJobsEmailPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <ConfirmJobsEmail />
        </Suspense>
      </div>
    </div>
  )
}
