'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { AuthLayout } from '@/components/auth-layout'
import { SocialAuthButtons } from '@/components/social-auth-buttons'
import { CitySelect } from '@/components/city-select'
import { isValidCity } from '@/lib/alberta-municipalities'
import { toNewsletterCity } from '@/lib/newsletter-cities'
import { resolveSignupSource, type SignupSource, type NewsletterTopic } from '@/lib/signup-source'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  // Deliberately starts unchecked: under CASL a pre-ticked box is not valid
  // express consent, so the reader has to opt in themselves. The two lists are
  // separate consents — ticking one must never enrol them in the other.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [jobsOptIn, setJobsOptIn] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  // Which surface sent them here. Read after mount — this is a client component
  // and useSearchParams would force the whole page behind a Suspense boundary.
  const [source, setSource] = useState<SignupSource>('site')
  const [nextPath, setNextPath] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const resolved = resolveSignupSource(window.location.search)
      setSource(resolved.source)
      setNextPath(resolved.path)
    } catch {
      /* window unavailable — keep the 'site' default */
    }
  }, [])

  const fromJobs = source === 'jobs'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!isValidCity(city)) {
      setError('Please choose your city from the list.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            city: city.trim(),
            // Attribution: which surface earned this account. Recorded once at
            // creation — it can't be reconstructed afterwards.
            signup_source: source,
            signup_path: nextPath,
          },
        },
      })
      if (error) throw error

      // Express consent only — one topic per box actually ticked. Fire-and-forget:
      // a newsletter failure must never block account creation, and /api/newsletter
      // already handles bounced addresses and re-subscribes.
      const topics: NewsletterTopic[] = [
        ...(newsletterOptIn ? (['culture'] as const) : []),
        ...(jobsOptIn ? (['jobs'] as const) : []),
      ]
      if (topics.length > 0) {
        try {
          await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              city: toNewsletterCity(city),
              optIn: true,
              topics,
              source: 'account-signup',
              signupSource: source,
              signupPath: nextPath,
            }),
          })
        } catch {
          /* non-fatal — the account still exists, they can subscribe later */
        }
      }

      if (data.session) {
        // Email confirmation is OFF — Supabase signs the user in immediately, so
        // send them straight into the site (the welcome email is handled globally
        // by <WelcomeMailer/> once they're authenticated).
        let next = '/'
        try {
          next = new URLSearchParams(window.location.search).get('next') || '/'
        } catch {
          /* window unavailable — fall back to home */
        }
        router.push(next)
        router.refresh()
      } else {
        // Email confirmation is ON — a confirmation link was emailed.
        setSuccess(`Almost there! We've sent a confirmation link to ${email}. Click it to activate your account, then sign in.`)
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle={
        fromJobs
          ? 'Apply to Alberta jobs, save the ones you like, and track every application in one place.'
          : 'Join the Alberta culture community. Comment on articles and share your perspective.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-1.5">
            City
          </label>
          <CitySelect id="city" value={city} onChange={setCity} disabled={loading} />
          <p className="mt-1.5 text-xs text-gray-500">So we can show you what’s happening near you.</p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
            placeholder="••••••••"
            minLength={6}
            required
          />
          <p className="mt-1.5 text-xs text-gray-500">Minimum 6 characters</p>
        </div>
        <SocialAuthButtons />

        {/* Two independent consents. Someone here for jobs should not start
            receiving culture email, or the reverse — so neither box implies
            the other and both start unticked. */}
        {fromJobs && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5 hover:border-gray-300">
            <input
              type="checkbox"
              checked={jobsOptIn}
              onChange={e => setJobsOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Email me new Alberta jobs</span>
              <span className="mt-0.5 block text-gray-600">
                New openings{city ? ` in ${city}` : ' in your city'}, once a week. Jobs only —
                nothing else. Unsubscribe any time.
              </span>
            </span>
          </label>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5 hover:border-gray-300">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={e => setNewsletterOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Email me the free Culture Alberta newsletter</span>
            <span className="mt-0.5 block text-gray-600">
              Local news and things to do{city ? ` in ${city}` : ' in your city'}, a few times a week.
              Unsubscribe any time.
            </span>
          </span>
        </label>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
            {success}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
