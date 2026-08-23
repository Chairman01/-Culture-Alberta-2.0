"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CompanyLogo } from '@/components/jobs/company-logo'
import { TrackBadge, BOARD_BADGE_STATUSES, TRACK_LABELS } from '@/components/jobs/track-badge'
import { JobTrackSummary } from '@/components/jobs/track-summary'
import { JobPanelActions } from '@/components/jobs/panel-actions'
import { JobPreferencesCard } from '@/components/jobs/job-preferences-card'
import { useAuth } from '@/components/auth-provider'
import { listJobTrackStatuses, advanceSavedJobStatus } from '@/lib/saved-jobs'
import {
  getJobPreferences, saveJobPreferences, scoreJob, hasAnswers,
  type JobPreferences, type MatchResult,
} from '@/lib/job-preferences'
import type { SavedJobStatus } from '@/lib/types/job'
import Link from 'next/link'
import {
  Search, MapPin, Clock, X, Building2, ExternalLink, Loader2, Sparkles, SlidersHorizontal,
  AlertCircle,
} from 'lucide-react'

/**
 * Client-side jobs browser — Indeed-style list + detail.
 *
 * Left column is a compact scannable list; selecting a row shows the full
 * posting in a sticky panel on the right. Below the lg breakpoint the panel is
 * dropped and each row simply navigates to its posting page.
 *
 * Every row stays a real <a href="/jobs/posting/…"> so crawlers still reach each
 * posting; on desktop the click is intercepted to fill the panel instead.
 *
 * The panel shows the employer's whole description, fetched per selection from
 * /api/jobs/[slug]. It cannot ship with the page: 500 rows × ~7.5KB of
 * description is over 3MB of payload for text the reader looks at one job at a
 * time. Arrow keys move the selection, so a signed-in reader can work down the
 * list reading full postings without a single click.
 */

export interface BrowserJob {
  id: string
  slug: string
  title: string
  company: string
  /** Display label, e.g. "Fort McMurray" — see JOB_CITY_LABELS. */
  city: string
  /** Locally hosted logo, preferred when present. */
  logoSrc?: string
  /** Employer website for the logo; undefined falls back to a lettered tile. */
  logoDomain?: string
  /** 'unknown' when the posting never says — most of them. */
  unionStatus?: 'union' | 'non-union' | 'unknown'
  category: string
  salaryText?: string
  postedAt?: string       // ISO — for the posted-within filter + New badge
  postedLabel?: string    // "July 12, 2026"
  employmentType?: string // "Full-time" etc.
  snippet?: string
  featured?: boolean
  manual?: boolean
}

/** Shape returned by /api/jobs/[slug]. */
interface JobDetail {
  id: string
  slug: string
  applyUrl: string
  expired: boolean
  descriptionHtml: string
  snippet: string
  locationRaw: string
  salaryText: string | null
  employmentType: string | null
  unionStatus: 'union' | 'non-union' | 'unknown'
}

const PAGE_SIZE = 20
const NEW_WITHIN_MS = 48 * 60 * 60 * 1000

const POSTED_WITHIN_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
] as const

export default function JobsBrowser({
  jobs,
  initialCity = 'all',
}: {
  jobs: BrowserJob[]
  initialCity?: string
}) {
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState(initialCity)
  const [category, setCategory] = useState('all')
  const [postedWithin, setPostedWithin] = useState('all')
  const [hasSalary, setHasSalary] = useState(false)
  const [employment, setEmployment] = useState('all')
  const [union, setUnion] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  /**
   * Where the reader was, kept across a trip off the board.
   *
   * Every bit of this screen lived in React memory, so opening a posting page
   * and pressing Back — or applying and coming back to the tab after the app
   * had been evicted — rebuilt it from scratch: page 1, no filters, first row
   * selected, scrolled to the top. Someone twelve rows into page 3 lost all of
   * it for the crime of applying to a job.
   *
   * sessionStorage rather than the URL: the filters change on every keystroke
   * and pushing each one through the router would refetch the server component
   * for a purely client-side change. Keyed by initialCity so /jobs and
   * /jobs/calgary keep their own place.
   */
  const stateKey = `jobs_board_state_${initialCity}`
  const restoredState = useRef(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (restoredState.current) return
    try {
      const raw = sessionStorage.getItem(stateKey)
      if (raw) {
        const s = JSON.parse(raw)
        restoredState.current = true
        if (typeof s.keyword === 'string') setKeyword(s.keyword)
        if (typeof s.city === 'string') setCity(s.city)
        if (typeof s.category === 'string') setCategory(s.category)
        if (typeof s.postedWithin === 'string') setPostedWithin(s.postedWithin)
        if (typeof s.hasSalary === 'boolean') setHasSalary(s.hasSalary)
        if (typeof s.employment === 'string') setEmployment(s.employment)
        if (typeof s.union === 'string') setUnion(s.union)
        if (typeof s.page === 'number') setPage(s.page)
        if (typeof s.selectedId === 'string') setSelectedId(s.selectedId)
        if (s.sortBy === 'match' || s.sortBy === 'newest') setSortBy(s.sortBy)
        // After the restored rows have been laid out, not before — scrolling to
        // 4,000px on a page still rendering its first twenty rows lands at the
        // bottom of a short document and the browser clamps it back to the top.
        if (typeof s.scrollY === 'number' && s.scrollY > 0) {
          requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, s.scrollY)))
        }
      }
    } catch {
      /* private mode, quota, corrupt entry — the default board is fine */
    }
    setHydrated(true)
  }, [stateKey])

  /**
   * The signed-in user's tracker state, so a job they've already applied to is
   * obvious while scanning. One query for every tracked job rather than one per
   * card — the board runs to hundreds of rows and nobody tracks more than a few
   * dozen. Signed-out visitors fetch nothing and see no badges.
   */
  const { user } = useAuth()
  const [tracked, setTracked] = useState<Record<string, SavedJobStatus>>({})

  useEffect(() => {
    let active = true
    if (!user) {
      setTracked({})
      return
    }
    listJobTrackStatuses()
      .then(map => active && setTracked(map))
      .catch(() => {})
    return () => { active = false }
  }, [user])

  /** Narrows the board to one tracker status, set from the summary strip. */
  const [trackFilter, setTrackFilter] = useState<SavedJobStatus | null>(null)

  /**
   * Ask once, on the way back from the employer's site.
   *
   * Clicking Apply only proves the form was opened, so it records 'started'.
   * Whether they finished is something only they know, and the moment they
   * return to this tab is the one moment they still remember — an hour later
   * the board is just a list of jobs that all look equally untouched.
   *
   * Only ever asked for a job still sitting at 'started', so answering "not
   * yet" is final and nobody gets nagged twice about the same job.
   */
  const [applyAsk, setApplyAsk] = useState<{ id: string; title: string } | null>(null)
  const pendingApply = useRef<{ id: string; title: string } | null>(null)

  const notePendingApply = useCallback((jobId: string, title: string) => {
    pendingApply.current = { id: jobId, title }
  }, [])

  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return
      const pending = pendingApply.current
      if (!pending) return
      pendingApply.current = null
      // Re-read from state at the moment of return: they may have marked it
      // applied on the panel themselves while they were away.
      setTracked(current => {
        if (current[pending.id] === 'started') setApplyAsk(pending)
        return current
      })
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => document.removeEventListener('visibilitychange', onReturn)
  }, [])

  const answerApplyAsk = useCallback(async (didApply: boolean) => {
    const asked = applyAsk
    setApplyAsk(null)
    if (!asked || !didApply || !user) return
    try {
      const now = await advanceSavedJobStatus(user.id, asked.id, 'applied')
      setTracked(prev => ({ ...prev, [asked.id]: now }))
    } catch {
      // Tracking is best-effort — never surface a failure here.
    }
  }, [applyAsk, user])

  // Signing out, or clearing the last job of the filtered status, must not
  // leave the reader staring at an empty board with no obvious way back.
  useEffect(() => {
    if (!trackFilter) return
    if (!user || !Object.values(tracked).includes(trackFilter)) setTrackFilter(null)
  }, [user, tracked, trackFilter])

  /** Marks made in the panel land here so the list badges update immediately. */
  const handleStatusChange = useCallback((jobId: string, status: SavedJobStatus | null) => {
    setTracked(prev => {
      const next = { ...prev }
      if (status === null) delete next[jobId]
      else next[jobId] = status
      return next
    })
  }, [])

  /** Badge-worthy status for a row, or null. Plain 'saved' stays quiet. */
  const badgeFor = useCallback(
    (id: string): SavedJobStatus | null => {
      const s = tracked[id]
      return s && BOARD_BADGE_STATUSES.includes(s) ? s : null
    },
    [tracked]
  )

  // ── Preferences ─────────────────────────────────────────────────────────────

  const [prefs, setPrefs] = useState<JobPreferences | null>(null)
  const [showPrefsCard, setShowPrefsCard] = useState(false)
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'match'>('newest')

  useEffect(() => {
    let active = true
    if (!user) {
      setPrefs(null)
      setSortBy('newest')
      // Signed-out visitors still see the pitch, once, until they wave it off.
      setShowPrefsCard(!sessionStorage.getItem('jobs_prefs_dismissed'))
      return
    }
    getJobPreferences()
      .then(p => {
        if (!active) return
        setPrefs(p)
        // Answers reorder the board. They never take anything off it.
        //
        // There was a "only show roles that fit me" filter that switched itself
        // on here, and on any short list — an employer's nine roles, a small
        // city — it could qualify nothing and hand the reader "Showing 0-0 of
        // 0" as their reward for answering a few questions. Sorting puts the
        // same roles at the top and leaves every other one reachable, so the
        // answers can only ever help. The dropdowns stay the reader's for the
        // same reason: nothing narrows this board except what they choose.
        if (hasAnswers(p) && !restoredState.current) setSortBy('match')
        setShowPrefsCard(!p || (!hasAnswers(p) && !p.dismissedAt))
      })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  const dismissPrefs = useCallback(() => {
    setShowPrefsCard(false)
    setEditingPrefs(false)
    if (!user) {
      sessionStorage.setItem('jobs_prefs_dismissed', '1')
      return
    }
    // Recorded so it stops asking on every visit, not just this one.
    saveJobPreferences(user.id, { dismissedAt: new Date().toISOString() }).catch(() => {})
  }, [user])

  const handlePrefsSaved = useCallback((saved: JobPreferences) => {
    setPrefs(saved)
    setShowPrefsCard(false)
    setEditingPrefs(false)
    setPage(1)
    if (hasAnswers(saved)) setSortBy('match')
  }, [])

  const matching = hasAnswers(prefs)

  /** jobId → match result. Recomputed only when the answers change. */
  const matches = useMemo(() => {
    const out = new Map<string, MatchResult>()
    if (!prefs || !matching) return out
    for (const j of jobs) out.set(j.id, scoreJob(j, prefs))
    return out
  }, [jobs, prefs, matching])

  // Top categories with counts, for the quick-filter chips
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of jobs) {
      if (j.category) counts.set(j.category, (counts.get(j.category) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [jobs])

  const filtersActive =
    keyword.trim() !== '' || city !== initialCity || category !== 'all' ||
    postedWithin !== 'all' || hasSalary || employment !== 'all' || union !== 'all'

  const clearFilters = () => {
    setKeyword('')
    setCity(initialCity)
    setCategory('all')
    setPostedWithin('all')
    setHasSalary(false)
    setEmployment('all')
    setUnion('all')
    setPage(1)
  }

  /**
   * The board never renders empty.
   *
   * An empty job board is a dead end — there is nothing to click, nothing to
   * read, and on a short page nothing to scroll, so it reads as broken rather
   * than as a filter being too tight. When the reader's filters exclude
   * everything, they are dropped, the whole board is shown, and the reader is
   * told what happened. Something is always on screen.
   */
  const { filtered, fallback } = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const cutoff =
      postedWithin === 'all'
        ? null
        : Date.now() - Number(postedWithin) * 24 * 60 * 60 * 1000

    const rank = (j: BrowserJob) => (j.featured ? 0 : j.manual ? 1 : 2)
    const sort = (list: BrowserJob[]) =>
      [...list].sort((a, b) => {
        const r = rank(a) - rank(b)
        if (r !== 0) return r
        if (sortBy === 'match' && matching) {
          const d = (matches.get(b.id)?.score ?? 0) - (matches.get(a.id)?.score ?? 0)
          if (d !== 0) return d
        }
        return (b.postedAt || '').localeCompare(a.postedAt || '')
      })

    const own = jobs.filter(j => {
      if (city !== 'all' && j.city !== city) return false
      if (category !== 'all' && j.category !== category) return false
      if (employment !== 'all' && j.employmentType !== employment) return false
      if (union !== 'all' && j.unionStatus !== union) return false
      if (hasSalary && !j.salaryText) return false
      if (cutoff && (!j.postedAt || new Date(j.postedAt).getTime() < cutoff)) return false
      if (kw) {
        const haystack = `${j.title} ${j.company} ${j.category} ${j.city}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })

    if (own.length > 0) return { filtered: sort(own), fallback: false }
    return { filtered: sort(jobs), fallback: true }
  }, [jobs, keyword, city, category, postedWithin, hasSalary, employment, union, matching, matches, sortBy])

  /**
   * Options come from the data, never a fixed list. The board currently holds
   * zero part-time roles, so a hardcoded "Part-time" option would be a filter
   * that always returns nothing — the single most annoying thing a job board
   * can do. Options appear when jobs exist to back them.
   */
  const employmentOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of jobs) {
      if (j.employmentType) counts.set(j.employmentType, (counts.get(j.employmentType) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [jobs])

  const unionOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of jobs) {
      if (j.unionStatus && j.unionStatus !== 'unknown') {
        counts.set(j.unionStatus, (counts.get(j.unionStatus) || 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [jobs])

  const cityOptions = useMemo(
    () => [...new Set(jobs.map(j => j.city))].sort((a, b) => a.localeCompare(b)),
    [jobs]
  )

  const matchCount = useMemo(() => {
    if (!matching) return 0
    let n = 0
    for (const j of jobs) if (matches.get(j.id)?.qualifies) n++
    return n
  }, [jobs, matches, matching])

  /**
   * "Which ones?" — clicking a tally in the summary narrows the board to just
   * those. Applied last, on top of every other filter, so it reads as "of what
   * I'm looking at, show me the ones I've applied to".
   */
  const visible = useMemo(
    () => (trackFilter ? filtered.filter(j => tracked[j.id] === trackFilter) : filtered),
    [filtered, trackFilter, tracked]
  )

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageJobs = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const showingFrom = visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safePage * PAGE_SIZE, visible.length)

  // Falling back to the first row (rather than setting state in an effect) keeps
  // the panel present in the server-rendered HTML and avoids a first-paint flash.
  // A stale selectedId after filtering simply falls back to the first result.
  const selected = pageJobs.find(j => j.id === selectedId) || pageJobs[0] || null

  const resetPage = () => setPage(1)

  /**
   * Save the reader's place.
   *
   * Written whenever the board changes, and again on the way out — `pagehide`
   * covers clicking through to a posting and Back, `visibilitychange` covers
   * switching to the employer's tab after Apply, which on mobile is often the
   * last event before the page is evicted from memory.
   */
  const persistState = useCallback(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({
        keyword, city, category, postedWithin, hasSalary, employment, union,
        page: safePage,
        selectedId: selected?.id ?? null,
        sortBy,
        scrollY: window.scrollY,
      }))
    } catch {
      /* quota or private mode — losing the place is survivable, throwing isn't */
    }
  }, [hydrated, stateKey, keyword, city, category, postedWithin, hasSalary,
      employment, union, safePage, selected?.id, sortBy])

  useEffect(() => { persistState() }, [persistState])

  useEffect(() => {
    const onHide = () => persistState()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [persistState])

  // ── Full posting, fetched per selection ─────────────────────────────────────

  const [details, setDetails] = useState<Record<string, JobDetail>>({})
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  // Slugs already requested, so re-selecting a row (or a re-render) never
  // refetches. Kept in a ref rather than derived from `details` so the effect
  // depends only on the selected slug.
  const requested = useRef<Set<string>>(new Set())

  /**
   * Loading and failure are tracked by slug rather than by a cleanup flag.
   *
   * The obvious version — `let active = true` and a cleanup that clears it —
   * silently never renders anything under StrictMode: the double-invoked effect
   * marks the slug requested on the first pass, cancels it, and the second pass
   * dedupes itself away, so the response arrives with nothing willing to store
   * it. Writing the result unconditionally and comparing slugs on render is
   * both simpler and correct whichever way the effect is invoked.
   */
  useEffect(() => {
    const slug = selected?.slug
    if (!slug || requested.current.has(slug)) return
    requested.current.add(slug)
    setLoadingSlug(slug)
    setFailedSlug(null)
    fetch(`/api/jobs/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: JobDetail) => setDetails(prev => ({ ...prev, [slug]: d })))
      .catch(() => {
        // Allow a retry on the next selection rather than caching the failure.
        requested.current.delete(slug)
        setFailedSlug(slug)
      })
      .finally(() => setLoadingSlug(cur => (cur === slug ? null : cur)))
  }, [selected?.slug])

  const detail = selected ? details[selected.slug] : undefined
  const loadingDetail = !!selected && loadingSlug === selected.slug
  const detailFailed = !!selected && failedSlug === selected.slug

  /**
   * Turn a page and go back to the first result.
   *
   * Without this you click Next at the bottom of page 1 and land at the bottom
   * of page 2 — looking at its last row, having skipped everything above it.
   * Same going back.
   *
   * The scroll has to wait for the new rows to commit. Calling scrollIntoView
   * in the click handler starts a smooth scroll that React then cancels when it
   * swaps the list out underneath it, which leaves the page turned and the
   * viewport where it was. Flagging the intent and scrolling from an effect
   * runs it after the re-render, when the anchor is at its final position.
   */
  const pendingScroll = useRef(false)

  const goToPage = useCallback((next: number) => {
    pendingScroll.current = true
    setPage(next)
    setSelectedId(null)
  }, [])

  useEffect(() => {
    if (!pendingScroll.current) return
    pendingScroll.current = false
    // Instant, not smooth. Gliding 3,000px is slow and disorienting when the
    // content under you has already changed, and smooth scrolling is silently
    // ignored in enough environments that relying on it means the jump simply
    // doesn't happen for some readers.
    document.getElementById('job-results-top')?.scrollIntoView({ block: 'start' })
  }, [page])

  const isNew = (j: BrowserJob) =>
    j.postedAt && Date.now() - new Date(j.postedAt).getTime() < NEW_WITHIN_MS

  // Selecting a row fills the detail panel rather than navigating. Modified
  // clicks (new tab/window) are left alone, and the row stays a real anchor so
  // crawlers still reach every posting page.
  const onRowClick = useCallback((e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    setSelectedId(id)
    if (typeof document !== 'undefined') {
      // On narrow screens the panel sits below the list, so bring it into view.
      if (window.matchMedia('(max-width: 1023px)').matches) {
        document.getElementById('job-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])

  /**
   * Arrow keys (and j/k) walk the list without clicking — the fastest way to
   * read twenty full postings in a row. Ignored while typing, so the search box
   * still behaves like a search box.
   */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const down = e.key === 'ArrowDown' || e.key === 'j'
      const up = e.key === 'ArrowUp' || e.key === 'k'
      if (!down && !up) return
      if (pageJobs.length === 0) return

      e.preventDefault()
      const current = pageJobs.findIndex(j => j.id === (selected?.id ?? ''))
      const nextIdx = Math.min(pageJobs.length - 1, Math.max(0, (current < 0 ? 0 : current) + (down ? 1 : -1)))
      const next = pageJobs[nextIdx]
      if (!next) return
      setSelectedId(next.id)
      document.getElementById(`job-row-${next.id}`)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pageJobs, selected?.id])

  return (
    <div>
      {/* Preferences prompt / editor */}
      {(showPrefsCard || editingPrefs) && (
        <JobPreferencesCard
          categories={categoryCounts.slice(0, 12).map(([c]) => c)}
          employmentTypes={employmentOptions.map(([t]) => t)}
          initial={prefs}
          editing={editingPrefs}
          onSaved={handlePrefsSaved}
          onDismiss={dismissPrefs}
        />
      )}

      {/* Prominent search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={keyword}
          onChange={e => { setKeyword(e.target.value); resetPage() }}
          placeholder="Search job title, company, or keyword…"
          aria-label="Search jobs"
          className="w-full rounded-xl border-2 border-gray-200 py-3.5 pl-12 pr-4 text-base shadow-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={city}
          onChange={e => { setCity(e.target.value); resetPage() }}
          aria-label="City"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All of Alberta</option>
          {/* Only cities actually represented in this result set — an empty
              option is a dead end for the reader. */}
          {cityOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); resetPage() }}
          aria-label="Category"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All categories</option>
          {categoryCounts.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <select
          value={postedWithin}
          onChange={e => { setPostedWithin(e.target.value); resetPage() }}
          aria-label="Posted within"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {POSTED_WITHIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {employmentOptions.length > 1 && (
          <select
            value={employment}
            onChange={e => { setEmployment(e.target.value); resetPage() }}
            aria-label="Employment type"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Any job type</option>
            {employmentOptions.map(([type, n]) => (
              <option key={type} value={type}>{type} ({n})</option>
            ))}
          </select>
        )}

        {unionOptions.length > 0 && (
          <select
            value={union}
            onChange={e => { setUnion(e.target.value); resetPage() }}
            aria-label="Union status"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Union or not</option>
            {unionOptions.map(([status, n]) => (
              <option key={status} value={status}>
                {status === 'union' ? 'Union' : 'Non-union'} ({n})
              </option>
            ))}
          </select>
        )}

        {matching && (
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as 'newest' | 'match'); resetPage() }}
            aria-label="Sort"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="match">Best matches first</option>
            <option value="newest">Newest first</option>
          </select>
        )}

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={hasSalary}
            onChange={e => { setHasSalary(e.target.checked); resetPage() }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Pay listed
        </label>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Match note — only once there are answers to match against. It says
          what the answers did; it offers no way to hide jobs, because they
          never should. */}
      {matching && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-600" />
          <span className="text-sm text-gray-800">
            {matchCount > 0
              ? <><span className="font-medium">{matchCount} of {jobs.length}</span> {matchCount === 1 ? 'role fits' : 'roles fit'} what you told us — {sortBy === 'match' ? 'those are at the top' : 'sort by best matches to bring them up'}.</>
              : <>Nothing here matches your answers, so every job is shown as usual.</>}
          </span>
          <button
            type="button"
            onClick={() => setEditingPrefs(true)}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Change my answers
          </button>
        </div>
      )}

      {/* Said plainly, because the list below is not what was asked for. */}
      {fallback && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span className="text-amber-900">
            Nothing matches those filters, so every job is shown instead.
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* The reader's own tally, pinned so it stays readable down the page. */}
      <JobTrackSummary tracked={tracked} activeFilter={trackFilter} onFilter={setTrackFilter} />

      {/* Result count — also the anchor paging scrolls back to. */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p id="job-results-top" className="scroll-mt-24 text-sm text-gray-600">
          {trackFilter
            ? `${visible.length} ${TRACK_LABELS[trackFilter].toLowerCase()} ${visible.length === 1 ? 'job' : 'jobs'}`
            : visible.length === jobs.length
              ? `${jobs.length} open ${jobs.length === 1 ? 'job' : 'jobs'} in Alberta`
              : `Showing ${showingFrom}-${showingTo} of ${visible.length} matching jobs`}
        </p>
        <p className="hidden text-xs text-gray-500 lg:block">
          Use <kbd className="rounded border border-gray-300 bg-gray-50 px-1">↑</kbd>{' '}
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1">↓</kbd> to read down the list
        </p>
      </div>

      {/* List + detail / empty states */}
      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold text-gray-700">New jobs are being added</p>
          <p className="mt-2 text-sm text-gray-500">
            The board updates daily with new openings across Alberta. Check back soon.
          </p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6 lg:items-start">
          {/* ── Left: scannable list ─────────────────────────────── */}
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {pageJobs.map(job => {
              const active = selected?.id === job.id
              const match = matching ? matches.get(job.id) : undefined
              // Dealt-with rows stay in the list but recede, so scanning finds
              // what is left to do. Removing them outright loses the answer to
              // "where did I apply?", which is the other half of the question.
              const settled =
                !active && (tracked[job.id] === 'applied' || tracked[job.id] === 'rejected')
              return (
                <li key={job.id} id={`job-row-${job.id}`} className="scroll-mt-24">
                  <Link
                    href={`/jobs/posting/${job.slug}`}
                    onClick={e => onRowClick(e, job.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`block border-l-4 px-4 py-4 transition-colors ${
                      active
                        ? 'border-l-blue-600 bg-blue-50/70'
                        : 'border-l-transparent hover:bg-gray-50'
                    } ${settled ? 'bg-gray-50/60 opacity-60 hover:opacity-100' : ''}`}
                  >
                    <div className="flex gap-3">
                      <CompanyLogo company={job.company} domain={job.logoDomain} src={job.logoSrc} size={44} className="mt-0.5" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-base font-semibold leading-snug ${active ? 'text-blue-800' : 'text-gray-900'}`}>
                            {job.title}
                          </h3>
                          {/* Tracker state outranks Featured and New: knowing
                              you already applied changes what you do with the
                              row, and the other two don't. */}
                          {badgeFor(job.id) ? (
                            <TrackBadge status={badgeFor(job.id)!} className="mt-0.5" />
                          ) : job.featured ? (
                            <span className="mt-0.5 flex-shrink-0 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                              Featured
                            </span>
                          ) : isNew(job) ? (
                            <span className="mt-0.5 flex-shrink-0 rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                              New
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-0.5 truncate text-sm text-gray-700">{job.company}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {job.city}
                          </span>
                          {job.postedLabel && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {job.postedLabel}
                            </span>
                          )}
                          {job.employmentType && <span>{job.employmentType}</span>}
                        </div>

                        {match && match.qualifies && match.reasons.length > 0 && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                            <Sparkles className="h-3 w-3" />
                            Fits: {match.reasons.slice(0, 3).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {job.salaryText && (
                      <p className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {job.salaryText}
                      </p>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* ── Right: detail panel (below the list on mobile) ───── */}
          {selected && (
            <aside id="job-detail-panel" className="mt-6 lg:mt-0 lg:sticky lg:top-24">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <CompanyLogo company={selected.company} domain={selected.logoDomain} src={selected.logoSrc} size={56} />
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold leading-tight text-gray-900">{selected.title}</h2>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-base text-gray-700">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {selected.company}
                    </p>
                    {badgeFor(selected.id) && (
                      <div className="mt-2">
                        <TrackBadge status={badgeFor(selected.id)!} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" /> {detail?.locationRaw || selected.city}
                  </span>
                  {selected.postedLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" /> Posted {selected.postedLabel}
                    </span>
                  )}
                </div>

                {selected.salaryText && (
                  <p className="mt-4">
                    <span className="rounded bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                      {selected.salaryText}
                    </span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{selected.category}</span>
                  {selected.employmentType && (
                    <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{selected.employmentType}</span>
                  )}
                  {detail?.unionStatus === 'union' && (
                    <span className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">Union position</span>
                  )}
                </div>

                {matching && matches.get(selected.id)?.reasons.length ? (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Fits what you told us: {matches.get(selected.id)!.reasons.join(' · ')}
                  </p>
                ) : null}

                {detail?.expired && (
                  <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    This posting has expired and may no longer be accepting applications.
                  </p>
                )}

                {/* The full description, capped so the sticky panel can't run
                    past the viewport and strand the buttons below the fold. */}
                <div className="mt-5 border-t border-gray-100 pt-4">
                  {loadingDetail && !detail ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading the full posting…
                    </div>
                  ) : detail?.descriptionHtml ? (
                    <div
                      key={selected.slug}
                      className="job-description max-h-[46vh] overflow-y-auto pr-2 text-sm"
                      dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }}
                    />
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {detail?.snippet || selected.snippet}
                      </p>
                      {detailFailed && (
                        <p className="mt-2 text-xs text-amber-700">
                          Could not load the full description. The full text is on{' '}
                          <Link href={`/jobs/posting/${selected.slug}`} className="underline">
                            the posting page
                          </Link>.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <JobPanelActions
                  jobId={selected.id}
                  applyUrl={detail?.applyUrl ?? null}
                  company={selected.company}
                  expired={detail?.expired ?? false}
                  status={tracked[selected.id] ?? null}
                  onStatusChange={handleStatusChange}
                  onApplyClick={id => notePendingApply(id, selected.title)}
                />

                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span>You apply on the employer&apos;s own site.</span>
                  <Link
                    href={`/jobs/posting/${selected.slug}`}
                    className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
                  >
                    Open posting page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">Page {safePage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Asked once, when they come back from the employer's site. A strip at
          the bottom rather than a modal: they may have come back to keep
          browsing, and a dialog in the way would punish them for applying. */}
      {applyAsk && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-gray-800">
              Did you finish applying to{' '}
              <span className="font-semibold">{applyAsk.title}</span>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => answerApplyAsk(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Yes, mark as applied
              </button>
              <button
                type="button"
                onClick={() => answerApplyAsk(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
