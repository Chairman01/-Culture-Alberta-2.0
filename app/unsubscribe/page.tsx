import Link from 'next/link'
import { CheckCircle, XCircle, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unsubscribe | Culture Alberta',
  description: 'You have been unsubscribed from Culture Alberta newsletters.',
  robots: 'noindex',
}

interface PageProps {
  searchParams: Promise<{
    success?: string
    error?: string
    email?: string
  }>
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams
  const isSuccess = params.success === 'true'
  const isError = !!params.error
  const email = params.email ? decodeURIComponent(params.email) : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-10 text-center">

        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <span className="text-xl font-black tracking-tight text-gray-900">
            Culture Alberta
          </span>
        </Link>

        {isSuccess ? (
          <>
            <div className="flex justify-center mb-5">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              You're unsubscribed
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-2">
              {email ? (
                <>
                  <span className="font-medium text-gray-700">{email}</span> has been removed from our newsletter list.
                </>
              ) : (
                'Your email has been removed from our newsletter list.'
              )}
            </p>
            <p className="text-gray-400 text-sm mb-8">
              You won't receive any more emails from us. Changed your mind? You can always re-subscribe on our website.
            </p>
          </>
        ) : isError ? (
          <>
            <div className="flex justify-center mb-5">
              <XCircle className="w-14 h-14 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Something went wrong
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              We couldn't process your unsubscribe request. The link may have expired or already been used.
              <br />
              <br />
              If you continue to receive emails, please contact us at{' '}
              <a href="mailto:hello@culturemedia.ca" className="text-blue-600 hover:underline">
                hello@culturemedia.ca
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-5">
              <Mail className="w-14 h-14 text-gray-300" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Unsubscribe
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              To unsubscribe from Culture Alberta newsletters, click the unsubscribe link in any email we've sent you.
            </p>
          </>
        )}

        <div className="border-t border-gray-100 pt-6 space-y-3">
          <Link
            href="/"
            className="block w-full py-3 px-6 bg-gray-900 text-white font-semibold rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            Back to Culture Alberta
          </Link>
          {isSuccess && (
            <Link
              href="/newsletter"
              className="block w-full py-3 px-6 bg-white text-gray-700 font-semibold rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Re-subscribe
            </Link>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Culture Media · Culture Alberta
      </p>
    </div>
  )
}
