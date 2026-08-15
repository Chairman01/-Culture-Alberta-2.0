'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Shield, Smartphone, Monitor } from 'lucide-react'

interface DayRow {
  day: string
  sessions: number
  blocked: number
  blocked_pct: number | null
  mobile_sessions: number
  mobile_blocked: number
  desktop_sessions: number
  desktop_blocked: number
}

interface Payload {
  totals: {
    sessions: number
    blocked: number
    blockedPct: number | null
    mobile: { sessions: number; blocked: number; pct: number | null }
    desktop: { sessions: number; blocked: number; pct: number | null }
  }
  days: DayRow[]
}

/** Enough measured sessions for the percentage to mean anything. */
const CONFIDENCE_THRESHOLD = 500

export default function AdBlockDashboard() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/adblock', { cache: 'no-store' })
      if (!res.ok) {
        setError(res.status === 401 ? 'Please sign in to the admin area.' : 'Failed to load.')
        return
      }
      setData(await res.json())
    } catch {
      setError('Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const t = data?.totals
  const enough = (t?.sessions ?? 0) >= CONFIDENCE_THRESHOLD

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ad blocker share</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Measured once per visitor session. Nothing is shown to readers and nothing identifying is
        stored — only a date, mobile or desktop, and two counts.
      </p>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

      {loading && !data ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : t && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
              <div className="text-xs font-medium text-gray-500 mb-1">Blocking ads</div>
              <div className="text-4xl font-bold text-gray-900">
                {t.blockedPct === null ? '—' : `${t.blockedPct}%`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t.blocked.toLocaleString()} of {t.sessions.toLocaleString()} sessions
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </div>
              <div className="text-4xl font-bold text-blue-700">
                {t.mobile.pct === null ? '—' : `${t.mobile.pct}%`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t.mobile.blocked.toLocaleString()} of {t.mobile.sessions.toLocaleString()}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </div>
              <div className="text-4xl font-bold text-amber-700">
                {t.desktop.pct === null ? '—' : `${t.desktop.pct}%`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t.desktop.blocked.toLocaleString()} of {t.desktop.sessions.toLocaleString()}
              </div>
            </div>
          </div>

          {!enough && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Not enough data yet.</strong> These percentages will swing around until
              roughly {CONFIDENCE_THRESHOLD.toLocaleString()} sessions have been measured — currently{' '}
              {t.sessions.toLocaleString()}. Give it a few days before drawing conclusions from them.
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 font-medium">Day</th>
                    <th className="px-4 py-2 font-medium text-right">Sessions</th>
                    <th className="px-4 py-2 font-medium text-right">Blocked</th>
                    <th className="px-4 py-2 font-medium text-right">Share</th>
                    <th className="px-4 py-2 font-medium text-right">Mobile</th>
                    <th className="px-4 py-2 font-medium text-right">Desktop</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.days.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        No sessions measured yet. Data appears once readers visit the live site.
                      </td>
                    </tr>
                  ) : data!.days.map(d => {
                    const pct = (b: number, s: number) => (s > 0 ? `${Math.round((1000 * b) / s) / 10}%` : '—')
                    return (
                      <tr key={d.day} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{d.day}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">{d.sessions.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">{d.blocked.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                          {d.blocked_pct === null ? '—' : `${d.blocked_pct}%`}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">{pct(d.mobile_blocked, d.mobile_sessions)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">{pct(d.desktop_blocked, d.desktop_sessions)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-1">Reading this number</p>
            <p>
              Detection counts a session as blocked if <em>either</em> a bait element is hidden or a
              request to an ad-shaped URL fails, so it errs slightly high. Treat it as a ceiling. The
              share that Mediavine&apos;s Ad Block Recovery could win back is a fraction of it, since
              that only reaches readers opted into Acceptable Ads.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
