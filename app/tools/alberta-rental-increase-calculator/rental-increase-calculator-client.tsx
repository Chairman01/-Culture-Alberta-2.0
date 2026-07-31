"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  Info,
} from "lucide-react"
import { Article } from "@/lib/types/article"
import { getArticleUrl } from "@/lib/utils/article-url"
import {
  TENANCY_RULES,
  RENT_INCREASE_FAQ,
  MIN_DAYS_BETWEEN_INCREASES,
  type TenancyType,
  parseDateInput,
  formatDateLong,
  formatDateShort,
  checkRentIncrease,
  noticeRequirementLabel,
} from "@/lib/alberta-tenancy"

function formatMoney(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })
}

interface Props {
  relatedArticles?: Article[]
  year: number
}

export default function RentalIncreaseCalculatorClient({ relatedArticles = [], year }: Props) {
  const [tenancy, setTenancy] = useState<TenancyType>("monthly")
  const [currentRent, setCurrentRent] = useState("")
  const [newRent, setNewRent] = useState("")
  const [noticeDate, setNoticeDate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [lastIncreaseDate, setLastIncreaseDate] = useState("")
  const [copied, setCopied] = useState(false)

  const results = useMemo(() => {
    const current = parseFloat(currentRent.replace(/,/g, ""))
    const proposed = parseFloat(newRent.replace(/,/g, ""))
    if (!currentRent || !newRent || isNaN(current) || isNaN(proposed) || current <= 0 || proposed <= 0) {
      return null
    }
    return checkRentIncrease({
      currentRent: current,
      newRent: proposed,
      tenancy,
      noticeDate: parseDateInput(noticeDate),
      effectiveDate: parseDateInput(effectiveDate),
      lastIncreaseDate: parseDateInput(lastIncreaseDate),
    })
  }, [currentRent, newRent, tenancy, noticeDate, effectiveDate, lastIncreaseDate])

  // A letter the tenant can actually send. This is the part of the tool people
  // come back for, so it names the specific rule that failed.
  const letter = useMemo(() => {
    if (!results || results.overall !== "fail") return null

    const reasons: string[] = []
    if (results.fixedTermBlocked) {
      reasons.push(
        "I am part-way through a fixed-term lease. Under the Residential Tenancies Act the rent cannot be increased before the end of the term, regardless of how much time has passed since the last increase."
      )
    }
    if (results.noticeStatus === "fail" && results.earliestDate && results.effectiveDate) {
      reasons.push(
        `The notice period was not met. Written notice was served on ${formatDateShort(results.noticeDate!)}, and my tenancy requires ${noticeRequirementLabel(tenancy).toLowerCase()} of notice. The earliest date this increase could take effect is ${formatDateShort(results.earliestDate)}, not ${formatDateShort(results.effectiveDate)}.`
      )
    }
    if (results.frequencyStatus === "fail" && results.earliestByFrequency) {
      reasons.push(
        `Less than ${MIN_DAYS_BETWEEN_INCREASES} days have passed since the last rent increase. The rent may not be increased again before ${formatDateShort(results.earliestByFrequency)}.`
      )
    }

    return [
      "Dear [landlord's name],",
      "",
      `I am writing about the notice of rent increase for [address], which would raise my rent from ${formatMoney(results.currentRent)} to ${formatMoney(results.newRent)} per month.`,
      "",
      reasons.length === 1
        ? "I believe this increase does not meet the requirements of the Residential Tenancies Act:"
        : "I believe this increase does not meet the requirements of the Residential Tenancies Act, for the following reasons:",
      "",
      ...reasons.map((r, i) => (reasons.length > 1 ? `${i + 1}. ${r}` : r)),
      "",
      "I will continue paying my current rent of " +
        formatMoney(results.currentRent) +
        " until a valid notice takes effect. Please confirm in writing that the increase has been withdrawn or corrected.",
      "",
      "Thank you,",
      "[your name]",
    ].join("\n")
  }, [results, tenancy])

  const copyLetter = useCallback(() => {
    if (!letter) return
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [letter])

  const activeRule = TENANCY_RULES.find((r) => r.value === tenancy)!

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
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              Alberta · {year} rules
            </span>
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Free · No sign-up</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
            Alberta Rent Increase Calculator
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Got a rent increase notice? Enter the numbers and we&apos;ll tell you how much more
            you&apos;re paying — and whether your landlord actually followed Alberta&apos;s rules.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* The Rules — plain language. Class is referenced by speakable schema. */}
        <div className="rental-rules-summary bg-blue-50 border border-blue-100 rounded-xl p-5">
          <p className="font-semibold text-blue-900 mb-3">What Alberta law says about rent increases</p>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>No cap.</strong> Alberta has no rent control. Your landlord can raise the rent by any amount.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>Written notice, and how much depends on your tenancy.</strong> Month to month needs 3 full tenancy months. Week to week needs 84 days. Other periodic terms need 90 days. Mobile home sites need 180 days. Verbal notice never counts.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>Once every 365 days.</strong> Measured from your last increase, or from the day you moved in if the rent has never gone up.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
              <span><strong>Never during a fixed-term lease.</strong> If your lease has an end date, the rent is locked until that date — even if a year goes by.</span>
            </li>
          </ul>
        </div>

        {/* Calculator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Your tenancy</h2>
            <p className="text-sm text-gray-500">This decides how much notice your landlord owes you.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TENANCY_RULES.map((rule) => (
              <button
                key={rule.value}
                type="button"
                onClick={() => setTenancy(rule.value)}
                aria-pressed={tenancy === rule.value}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  tenancy === rule.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 ${
                      tenancy === rule.value ? "border-blue-600 bg-blue-600" : "border-gray-300"
                    }`}
                  >
                    {tenancy === rule.value && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{rule.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{rule.hint}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-gray-600">
              Notice required for a {activeRule.label.toLowerCase()} tenancy:{" "}
              <strong className="text-gray-900">{activeRule.noticeLabel.toLowerCase()}</strong>.
            </p>
          </div>

          <hr className="border-gray-100" />

          <h2 className="text-lg font-bold text-gray-900">Your rent details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="current-rent" className="block text-sm font-medium text-gray-700 mb-1.5">
                What you pay now <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  id="current-rent"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1800"
                  value={currentRent}
                  onChange={(e) => setCurrentRent(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-rent" className="block text-sm font-medium text-gray-700 mb-1.5">
                What they want to charge <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  id="new-rent"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1950"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notice-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                When did you get written notice?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                id="notice-date"
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                When does the increase start?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                id="effective-date"
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="last-increase" className="block text-sm font-medium text-gray-700 mb-1.5">
                Last rent increase — or your move-in date if it has never gone up
                <span className="text-gray-400 font-normal ml-1">(optional — checks the 365-day rule)</span>
              </label>
              <input
                id="last-increase"
                type="date"
                className="w-full sm:w-1/2 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={lastIncreaseDate}
                onChange={(e) => setLastIncreaseDate(e.target.value)}
              />
            </div>
          </div>

          {!results && (
            <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
              Enter both rent amounts to see your results. Add the dates and we&apos;ll check the increase against the law.
            </p>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Verdict */}
            {results.overall !== "unknown" && (
              <div
                className={`rounded-xl p-5 ${
                  results.overall === "fail" ? "bg-red-600" : "bg-green-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  {results.overall === "fail" ? (
                    <XCircle className="w-7 h-7 text-white shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7 text-white shrink-0" />
                  )}
                  <div>
                    <p className="text-white font-bold text-xl leading-tight">
                      {results.overall === "fail"
                        ? "This increase does not look legal"
                        : "This increase looks legal"}
                    </p>
                    <p className={`text-sm mt-1 ${results.overall === "fail" ? "text-red-100" : "text-green-100"}`}>
                      {results.overall === "fail"
                        ? "Based on what you entered, at least one rule was not followed. Details below — and there's a letter you can send."
                        : "Based on what you entered, the notice and timing rules check out. Alberta has no cap on the amount itself."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cost numbers */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">What this means for your wallet</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Per month</p>
                  <p className={`text-lg sm:text-2xl font-bold tabular-nums ${results.monthlyIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.monthlyIncrease >= 0 ? "+" : ""}
                    {formatMoney(results.monthlyIncrease)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Increase</p>
                  <p className={`text-lg sm:text-2xl font-bold tabular-nums ${results.percentIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.percentIncrease >= 0 ? "+" : ""}
                    {results.percentIncrease.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Per year</p>
                  <p className={`text-lg sm:text-2xl font-bold tabular-nums ${results.annualIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {results.annualIncrease >= 0 ? "+" : ""}
                    {formatMoney(results.annualIncrease)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-blue-50 rounded-xl px-5 py-4">
                <span className="text-gray-700 font-medium">New monthly rent</span>
                <span className="text-2xl font-bold text-blue-700">{formatMoney(results.newRent)}</span>
              </div>
            </div>

            {/* Fixed-term block */}
            {results.fixedTermBlocked && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">Fixed-term lease</p>
                    <p className="text-sm text-gray-700">
                      Rent cannot be increased partway through a fixed-term lease, even if more than{" "}
                      {MIN_DAYS_BETWEEN_INCREASES} days have passed since the last increase. Your landlord has
                      to wait until the term ends.
                    </p>
                    <p className="text-sm font-medium text-red-700">
                      ✗ Any increase before your lease end date is not enforceable.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notice check */}
            {!results.fixedTermBlocked && results.earliestDate && (
              <div
                className={`rounded-xl border p-5 ${
                  results.noticeStatus === "fail"
                    ? "bg-red-50 border-red-200"
                    : results.noticeStatus === "pass"
                    ? "bg-green-50 border-green-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {results.noticeStatus === "pass" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  ) : results.noticeStatus === "fail" ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">
                      Notice check — {activeRule.noticeLabel.toLowerCase()}
                    </p>
                    <p className="text-sm text-gray-700">
                      Notice received <strong>{formatDateLong(results.noticeDate!)}</strong> means the earliest
                      this increase can legally start is <strong>{formatDateLong(results.earliestDate)}</strong>.
                    </p>
                    {results.noticeStatus === "pass" && (
                      <p className="text-sm font-medium text-green-700">✓ Notice timing is valid.</p>
                    )}
                    {results.noticeStatus === "fail" && (
                      <p className="text-sm font-medium text-red-700">
                        ✗ Too soon. You don&apos;t have to pay the higher amount until{" "}
                        {formatDateLong(results.earliestDate)}.
                      </p>
                    )}
                    {results.noticeStatus === "unknown" && (
                      <p className="text-sm text-blue-700">
                        Add the increase start date and we&apos;ll check it against this.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 365-day check */}
            {!results.fixedTermBlocked && results.frequencyStatus !== "unknown" && (
              <div
                className={`rounded-xl border p-5 ${
                  results.frequencyStatus === "pass"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {results.frequencyStatus === "pass" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">Once-every-365-days check</p>
                    {results.daysSinceLast !== null && (
                      <p className="text-sm text-gray-700">
                        <strong>{results.daysSinceLast} days</strong> between your last increase and this one.
                      </p>
                    )}
                    {results.frequencyStatus === "pass" ? (
                      <p className="text-sm font-medium text-green-700">
                        ✓ At least {MIN_DAYS_BETWEEN_INCREASES} days have passed — this rule is satisfied.
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-red-700">
                        ✗ Fewer than {MIN_DAYS_BETWEEN_INCREASES} days. The rent can&apos;t go up again until{" "}
                        {results.earliestByFrequency && formatDateLong(results.earliestByFrequency)}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Letter */}
            {letter && (
              <div className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Ready to send</p>
                    <h2 className="text-lg font-bold text-gray-900 mt-0.5">Your letter to your landlord</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Names the exact rule that was missed. Fill in the brackets and send it in writing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyLetter}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy letter"}
                  </button>
                </div>
                <pre className="px-6 py-5 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 max-h-80 overflow-y-auto">
                  {letter}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* What to do if something's wrong */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">What can you do if the increase isn&apos;t legal?</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              If your landlord hasn&apos;t followed the notice rules, is raising rent inside{" "}
              {MIN_DAYS_BETWEEN_INCREASES} days, or is raising it during a fixed term, the increase is{" "}
              <strong>not enforceable</strong>. You don&apos;t have to pay it.
            </p>
            <p>Your options:</p>
            <ul className="space-y-2 pl-1">
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">1.</span>
                <span>
                  Write to your landlord naming the rule that wasn&apos;t followed — the tool above generates
                  this for you. Keep a copy.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">2.</span>
                <span>
                  File with the{" "}
                  <a
                    href="https://www.alberta.ca/residential-tenancy-dispute-resolution-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Residential Tenancy Dispute Resolution Service (RTDRS)
                  </a>{" "}
                  — $75, and it can be done online.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-blue-500 font-bold flex-shrink-0">3.</span>
                <span>Take it to Provincial Court (Civil Division) if needed — this is the last resort.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* FAQ — rendered from the same source as the FAQPage schema */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Common questions</h2>
          {RENT_INCREASE_FAQ.map(({ q, a }) => (
            <details key={q} className="group border-b border-gray-100 last:border-0">
              <summary className="flex items-center justify-between cursor-pointer py-3.5 font-medium text-gray-900 list-none gap-3">
                {q}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-sm text-gray-600 pb-3.5 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="rounded-xl border border-gray-900 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Know your rights</p>
          <h2 className="mt-2 text-xl font-bold text-gray-900">Alberta housing news, in plain language</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Rent rules, tenant rights and Alberta housing costs — explained without the legal jargon, free in
            your inbox.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/#newsletter"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Join the newsletter
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
            >
              Browse all Alberta tools
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>
            This tool is general information, not legal advice. Rules can change and individual tenancies vary.
            For a dispute, contact the RTDRS or a lawyer, and verify the current rules with the{" "}
            <a
              href="https://www.alberta.ca/residential-tenancies-act"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Government of Alberta
            </a>{" "}
            or{" "}
            <a
              href="https://www.landlordandtenant.org/notices/rent-increase/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              CPLEA
            </a>
            .
          </p>
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Related reading</h2>
            <div className="space-y-4">
              {relatedArticles.map((article) => (
                <Link key={article.id} href={getArticleUrl(article)} className="group flex gap-4 items-start">
                  {article.imageUrl && !article.imageUrl.startsWith("data:") && (
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
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </p>
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
            <Link
              href="/tools/calgary-vs-edmonton-cost-of-living"
              className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
            >
              <span className="text-xl">⚖️</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Calgary vs Edmonton</p>
                <p className="text-xs text-gray-400">Cost of living comparison</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-blue-400 transition-colors" />
            </Link>
            <Link
              href="/tools/alberta-property-tax-calculator"
              className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
            >
              <span className="text-xl">🏠</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Property Tax</p>
                <p className="text-xs text-gray-400">Estimate your Alberta bill</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-blue-400 transition-colors" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
