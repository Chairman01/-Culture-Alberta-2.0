'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { AuthLayout } from '@/components/auth-layout'
import { SocialAuthButtons } from '@/components/social-auth-buttons'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsConfirmation(false)
    setLoading(true)
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setNeedsConfirmation(true)
        } else if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('invalid email or password')) {
          setError('Incorrect email or password. Please try again.')
        } else {
          setError(error.message)
        }
        return
      }
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendSent(false)
    try {
      await supabaseBrowser.auth.resend({ type: 'signup', email })
      setResendSent(true)
    } catch {
      setError('Failed to resend confirmation email. Please try again.')
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to comment on articles and participate in the Alberta culture community."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
            required
          />
        </div>
        <SocialAuthButtons />
        {needsConfirmation && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-2">
            <p className="font-semibold">Please confirm your email first.</p>
            <p>We sent a confirmation link to <strong>{email}</strong>. Check your inbox (and spam folder).</p>
            {resendSent ? (
              <p className="text-green-700 font-medium">✓ Confirmation email resent!</p>
            ) : (
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="underline font-medium hover:text-amber-900"
              >
                Resend confirmation email
              </button>
            )}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}
