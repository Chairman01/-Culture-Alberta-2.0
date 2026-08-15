'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { JOB_CITIES, JOB_CITY_LABELS } from '@/lib/jobs'
import { toNewsletterCity } from '@/lib/newsletter-cities'
import { saveJobPreferences, type JobPreferences } from '@/lib/job-preferences'
import type { JobCity } from '@/lib/types/job'

/**
 * The "what are you actually looking for" card at the top of the board.
 *
 * Shown to signed-in users who have neither answered nor waved it off. Every
 * question is optional and answering none of them is the same as dismissing —
 * the board works perfectly well unsorted, and a wall of required fields in
 * front of a job board is worse than no personalisation at all.
 */

function Chips<T extends string>({
  options, selected, onToggle,
}: {
  options: Array<{ value: T; label: string }>
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              on
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
            }`}
          >
            {on && <Check className="mr-1 inline h-3 w-3" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function JobPreferencesCard({
  categories,
  employmentTypes,
  onSaved,
  onDismiss,
  initial,
  /** Rendered as an always-open editor rather than a dismissible prompt. */
  editing = false,
}: {
  categories: string[]
  employmentTypes: string[]
  onSaved: (prefs: JobPreferences) => void
  onDismiss: () => void
  initial?: JobPreferences | null
  editing?: boolean
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [cities, setCities] = useState<JobCity[]>(initial?.cities ?? [])
  const [cats, setCats] = useState<string[]>(initial?.categories ?? [])
  const [types, setTypes] = useState<string[]>(initial?.employmentTypes ?? [])
  const [keywords, setKeywords] = useState(initial?.keywords.join(', ') ?? '')
  const [salaryMin, setSalaryMin] = useState(initial?.salaryMin ? String(initial.salaryMin) : '')
  const [emailMatches, setEmailMatches] = useState(initial?.emailMatches ?? false)
  const [saving, setSaving] = useState(false)

  function toggle<T extends string>(list: T[], set: (v: T[]) => void, value: T) {
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Signed-out visitors get the pitch, not the form — there is nowhere to
  // store an answer until there's an account.
  if (!user) {
    return (
      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">Tell us what you&apos;re looking for</p>
            <p className="mt-1 text-sm text-gray-700">
              Answer a few questions once and the board opens on the roles that fit — your cities,
              your kind of work, sorted by best match. Free account, takes a minute.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/auth/signup?next=/jobs"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create a free account
              </Link>
              <Link
                href="/auth/signin?next=/jobs"
                className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Sign in
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const parsedKeywords = keywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 10)

  const parsedSalary = salaryMin.trim() ? Number(salaryMin.replace(/[^\d]/g, '')) : null

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const prefs: JobPreferences = {
      cities,
      categories: cats,
      employmentTypes: types,
      keywords: parsedKeywords,
      salaryMin: parsedSalary && Number.isFinite(parsedSalary) ? parsedSalary : null,
      emailMatches,
      dismissedAt: null,
    }

    try {
      await saveJobPreferences(user!.id, prefs)

      // Ticking the box is express consent to the jobs list specifically. It
      // goes through the normal subscribe route so the same bounce guard and
      // topic handling apply as any other signup — the culture list is
      // untouched either way.
      if (emailMatches && user!.email) {
        const newsletterCity = cities.length > 0
          ? toNewsletterCity(cities[0])
          : 'other-alberta'
        try {
          await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user!.email,
              city: newsletterCity,
              optIn: true,
              topics: ['jobs'],
              signupSource: 'jobs-preferences',
              signupPath: '/jobs',
            }),
          })
        } catch {
          // Preferences saved; the list signup is secondary and retried next save.
        }
      }

      onSaved(prefs)
      toast({
        title: 'Saved',
        description: emailMatches
          ? 'The board is now sorted for you, and you\'re on the jobs email.'
          : 'The board is now sorted for you. Change this any time.',
      })
    } catch {
      toast({
        title: 'Could not save',
        description: 'Your preferences were not stored. Try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`mb-6 rounded-2xl border p-5 ${editing ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">
            {editing ? 'What you\'re looking for' : 'What kind of work are you looking for?'}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Answer what you like — the board opens on these and sorts the best matches first.
            Skip anything you don&apos;t mind about.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Not now"
            className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Where would you work?</p>
          <Chips
            options={JOB_CITIES.map(c => ({ value: c, label: JOB_CITY_LABELS[c] }))}
            selected={cities}
            onToggle={v => toggle(cities, setCities, v)}
          />
        </div>

        {categories.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">What kind of work?</p>
            <Chips
              options={categories.map(c => ({ value: c, label: c }))}
              selected={cats}
              onToggle={v => toggle(cats, setCats, v)}
            />
          </div>
        )}

        {employmentTypes.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Hours</p>
            <Chips
              options={employmentTypes.map(t => ({ value: t, label: t }))}
              selected={types}
              onToggle={v => toggle(types, setTypes, v)}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="jp-keywords" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Job titles or employers
            </label>
            <input
              id="jp-keywords"
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="warehouse, admin, University of Alberta"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Separate with commas.</p>
          </div>
          <div>
            <label htmlFor="jp-salary" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pay you&apos;re aiming for
            </label>
            <input
              id="jp-salary"
              type="text"
              inputMode="numeric"
              value={salaryMin}
              onChange={e => setSalaryMin(e.target.value)}
              placeholder="60000"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              A year, before tax. Most postings don&apos;t state pay, so this nudges the order rather
              than hiding anything.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white p-3">
          <input
            type="checkbox"
            checked={emailMatches}
            onChange={e => setEmailMatches(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Email me matching jobs.</span>{' '}
            Only roles that fit these answers, and only to {user!.email}. Unsubscribe any time —
            this is separate from the culture newsletter.
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save and sort my board
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {editing ? 'Close' : 'Not now'}
        </button>
      </div>
    </div>
  )
}
