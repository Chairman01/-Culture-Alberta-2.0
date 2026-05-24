"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, AlertTriangle } from "lucide-react"
import { Article } from "@/lib/types/article"
import { getArticleUrl } from "@/lib/utils/article-url"

// ---------------------------------------------------------------------------
// Alberta Residential Tenancies Act — rent increase rules (2025)
// Source: Alberta Residential Tenancies Act, RSA 2000, c R-17.1
// No percentage cap. Must give 3 full calendar months written notice.
// Can only increase once per 12 months.
// ---------------------------------------------------------------------------
const NOTICE_MONTHS_REQUIRED = 3
const MIN_MONTHS_BETWEEN_INCREASES = 12

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Edmonton",
  })
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })
}

// Returns the first of the month that is at least `months` full calendar months after noticeDate
// e.g. notice May 15 → earliest Sept 1
function earliestEffectiveDate(noticeDate: Date, requiredMonths: number): Date {
  const d = new Date(noticeDate)
  d.setMonth(d.getMonth() + requiredMonths + 1)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

interface Props {
  relatedArticles?: Article[]
}

export default function RentalIncreaseCalculatorClient({ relatedArticles = [] }: Props) {
  const [currentRent, setCurrentRent] = useState("")
  const [newRent, setNewRent] = useState("")
  const [noticeDate, setNoticeDate] = useState("")
  const [lastIncreaseDate, setLastIncreaseDate] = useState("")
  const [proposedEffectiveDate, setProposedEffectiveDate] = useState("")

  const results = useMemo(() => {
    const current = parseFloat(currentRent.replace(/,/g, ""))
    const proposed = parseFloat(newRent.replace(/,/g, ""))

    if (!currentRent || !newRent || isNaN(current) || isNaN(proposed) || current <= 0 || proposed <= 0) {
      return null
    }

    const monthlyIncrease = proposed - current
    const percentIncrease = ((proposed - current) / current) * 100
    const annualExtraCost = monthlyIncrease * 12

    let noticeOk: boolean | null = null
    let earliestDate: Date | null = null
    let noticeDateObj: Date | null = null
    let proposedDateObj: Date | null = null

    if (noticeDate) {
      noticeDateObj = new Date(noticeDate + "T00:00:00")
      earliestDate = earliestEffectiveDate(noticeDateObj, NOTICE_MONTHS_REQUIRED)

      if (proposedEffectiveDate) {
        proposedDateObj = new Date(proposedEffectiveDate + "T00:00:00")
        noticeOk = proposedDateObj >= earliestDate
      }
    }

    let twelveMonthOk: boolean | null = null
    let monthsSinceLast: number | null = null

    if (lastIncreaseDate && proposedEffectiveDate) {
      const lastObj = new Date(lastIncreaseDate + "T00:00:00")
      const propObj = new Date(proposedEffectiveDate + "T00:00:00")
      monthsSinceLast =
        (propObj.getFullYear() - lastObj.getFullYear()) * 12 +
        (propObj.getMonth() - lastObj.getMonth())
      twelveMonthOk = monthsSinceLast >= MIN_MONTHS_BETWEEN_INCREASES
    }

    return {
      current,
      proposed,
      monthlyIncrease,
      percentIncrease,
      annualExtraCost,
      earliestDate,
      noticeDateObj,
      proposedDateObj,
      noticeOk,
      twelveMonthOk,
      monthsSinceLast,
    }
  }, [currentRent, newRent, noticeDate, proposedEffectiveDate, lastIncreaseDate])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-5 max-w-3xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            All Alberta Tools
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Alberta · 2025 rules</span>
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Free</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
            Alberta Rental Increase Calculator
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Got a rent increase notice? Enter the numbers below and we&apos;ll tell you how much more you&apos;re paying — and whether your landlord has followed the rules.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">

        {/* The Rules — plain language */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <p className="font-semibold text-blue-900 mb-3">What Alberta law says about rent increases</p>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>No cap.</strong> Your landlord can raise rent by any amount — Alberta has no limit on how much.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>3 full months written notice.</strong> They must give you notice in writing at least 3 full calendar months before the increase kicks in. Verbal notice doesn&apos;t count.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>Once per year only.</strong> They can&apos;t raise rent twice in any 12-month stretch.</span>
            </li>
          </ul>
        </div>

        {/* Calculator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Your rent details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                What you pay now <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1800"
                  value={currentRent}
                  onChange={e => setCurrentRent(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                What they want to charge <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1950"
                  value={newRent}
                  onChange={e => setNewRent(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                When did you receive written notice?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={noticeDate}
                onChange={e => setNoticeDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                When does the increase start?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={proposedEffectiveDate}
                onChange={e => setProposedEffectiveDate(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                When was your last rent increase?
                <span className="text-gray-400 font-normal ml-1">(optional — checks the once-per-year rule)</span>
              </label>
              <input
                type="date"
                className="w-full sm:w-1/2 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={lastIncreaseDate}
                onChange={e => setLastIncreaseDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Cost numbers */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">What this means for your wallet</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Per month</p>
                  <p className={`text-2xl font-bold ${results.monthlyIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.monthlyIncrease >= 0 ? "+" : ""}{formatMoney(results.monthlyIncrease)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Increase</p>
                  <p className={`text-2xl font-bold ${results.percentIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.percentIncrease >= 0 ? "+" : ""}{results.percentIncrease.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Per year</p>
                  <p className={`text-2xl font-bold ${results.annualExtraCost > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.annualExtraCost >= 0 ? "+" : ""}{formatMoney(results.annualExtraCost)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-blue-50 rounded-xl px-5 py-4">
                <span className="text-gray-700 font-medium">New monthly rent</span>
                <span className="text-2xl font-bold text-blue-700">{formatMoney(results.proposed)}</span>
              </div>
            </div>

            {/* 3-month notice check */}
            {results.earliestDate && (
              <div className={`rounded-xl border p-5 ${results.noticeOk === false ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-start gap-3">
                  {results.noticeOk === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : results.noticeOk === false ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">3-month notice check</p>
                    <p className="text-sm text-gray-700">
                      Notice received <strong>{formatDateLong(results.noticeDateObj!)}</strong> means the earliest this increase can legally start is <strong>{formatDateLong(results.earliestDate)}</strong>.
                    </p>
                    {results.noticeOk === true && (
                      <p className="text-sm font-medium text-green-700">✓ Notice timing is valid.</p>
                    )}
                    {results.noticeOk === false && (
                      <p className="text-sm font-medium text-red-700">
                        ✗ Too soon. This increase can&apos;t legally start before {formatDateLong(results.earliestDate)}. You don&apos;t have to pay the higher amount until then.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 12-month check */}
            {results.twelveMonthOk !== null && (
              <div className={`rounded-xl border p-5 ${results.twelveMonthOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-start gap-3">
                  {results.twelveMonthOk ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">Once-per-year check</p>
                    {results.monthsSinceLast !== null && (
                      <p className="text-sm text-gray-700">
                        About <strong>{results.monthsSinceLast} months</strong> since your last increase.
                      </p>
                    )}
                    {results.twelveMonthOk ? (
                      <p className="text-sm font-medium text-green-700">✓ More than 12 months have passed — this rule is satisfied.</p>
                    ) : (
                      <p className="text-sm font-medium text-red-700">
                        ✗ Less than 12 months since the last increase. Your landlord cannot legally raise rent again yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* What to do if something's wrong */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">What can you do if the increase isn&apos;t legal?</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>If your landlord hasn&apos;t followed the notice rules or is raising rent twice in 12 months, the increase is <strong>not enforceable</strong>. You don&apos;t have to pay it.</p>
            <p>Your options:</p>
            <ul className="space-y-2 pl-1">
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">1.</span>
                <span>Write back to your landlord pointing out which rule wasn&apos;t followed. Keep it in writing.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">2.</span>
                <span>File a complaint with the <a href="https://www.alberta.ca/residential-tenancy-dispute-resolution-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Residential Tenancy Dispute Resolution Service (RTDRS)</a> — costs $75 and can be done online.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">3.</span>
                <span>Take it to Provincial Court (Civil Division) if needed — this is the last resort.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Common questions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Common questions</h2>
          {[
            {
              q: "Is there a limit on how much rent can go up in Alberta?",
              a: "No. Alberta scrapped rent control in 1995 and never brought it back. Your landlord can raise rent by any amount — $50 or $500 — as long as they follow the notice and timing rules.",
            },
            {
              q: "What counts as \"written notice\"?",
              a: "A physical letter or email specifically telling you about the rent increase, the new amount, and the date it takes effect. A text message or verbal mention doesn't count.",
            },
            {
              q: "My landlord gave 3 months notice but the increase starts mid-month. Is that valid?",
              a: "The increase has to align with your tenancy agreement. For monthly tenancies, the effective date should typically be the first day of a rental period. An increase starting mid-month is unusual and worth questioning.",
            },
            {
              q: "Can my landlord raise rent when I renew a lease?",
              a: "Yes, but the same rules apply — 3 months written notice and at least 12 months since the last increase. Even a lease renewal doesn't let them skip those requirements.",
            },
            {
              q: "I'm in a mobile home — does any of this apply to me?",
              a: "Mobile home site tenancies have a longer notice requirement: 6 months written notice instead of 3. Otherwise the same once-per-year rule applies.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group border-b border-gray-100 last:border-0">
              <summary className="flex items-center justify-between cursor-pointer py-3.5 font-medium text-gray-900 list-none">
                {q}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3 transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-sm text-gray-600 pb-3.5 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>This tool is for general information only and is not legal advice. If you have a dispute, consider speaking with a lawyer or contacting the RTDRS. Rules can change — always verify with the <a href="https://www.alberta.ca/rent-increases" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Government of Alberta</a>.</p>
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Related reading</h2>
            <div className="space-y-4">
              {relatedArticles.map(article => (
                <Link key={article.id} href={getArticleUrl(article)} className="group flex gap-4 items-start">
                  {article.imageUrl && !article.imageUrl.startsWith('data:') && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{article.title}</p>
                    {article.category && <p className="text-xs text-gray-400 mt-1">{article.category}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* More tools */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">More Alberta tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/tools/calgary-vs-edmonton-cost-of-living" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <span className="text-xl">⚖️</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Calgary vs Edmonton</p>
                <p className="text-xs text-gray-400">Cost of living comparison</p>
              </div>
            </Link>
            <Link href="/tools/aish-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">AISH Calculator</p>
                <p className="text-xs text-gray-400">Assured income payments</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
