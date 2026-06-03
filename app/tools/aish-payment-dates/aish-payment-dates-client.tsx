"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import { Calendar, Clock, ArrowRight, AlertCircle, CheckCircle2, Info } from "lucide-react"

// ---------------------------------------------------------------------------
// 2026 AISH payment deposit schedule
// Payments are deposited on the last banking day of the month BEFORE
// the payment month. Source: Alberta government AISH program.
// ---------------------------------------------------------------------------
const AISH_2026_PAYMENT_DATES = [
  { month: "January 2026",   depositDate: new Date(2025, 11, 31), label: "Wed, Dec 31, 2025" },
  { month: "February 2026",  depositDate: new Date(2026,  0, 30), label: "Fri, Jan 30, 2026"  },
  { month: "March 2026",     depositDate: new Date(2026,  1, 27), label: "Fri, Feb 27, 2026"  },
  { month: "April 2026",     depositDate: new Date(2026,  2, 31), label: "Tue, Mar 31, 2026"  },
  { month: "May 2026",       depositDate: new Date(2026,  3, 30), label: "Thu, Apr 30, 2026"  },
  { month: "June 2026",      depositDate: new Date(2026,  4, 29), label: "Fri, May 29, 2026"  },
  { month: "July 2026",      depositDate: new Date(2026,  5, 30), label: "Tue, Jun 30, 2026"  },
  { month: "August 2026",    depositDate: new Date(2026,  6, 31), label: "Fri, Jul 31, 2026"  },
  { month: "September 2026", depositDate: new Date(2026,  7, 31), label: "Mon, Aug 31, 2026"  },
  { month: "October 2026",   depositDate: new Date(2026,  8, 30), label: "Wed, Sep 30, 2026"  },
  { month: "November 2026",  depositDate: new Date(2026,  9, 30), label: "Fri, Oct 30, 2026"  },
  { month: "December 2026",  depositDate: new Date(2026, 10, 30), label: "Mon, Nov 30, 2026"  },
]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function getCountdown(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

// Midnight of the deposit date (start of that day)
function depositStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export default function AISHPaymentDatesClient() {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { nextEntry, nextIndex, allStatus } = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let nextIndex = -1
    for (let i = 0; i < AISH_2026_PAYMENT_DATES.length; i++) {
      const d = depositStart(AISH_2026_PAYMENT_DATES[i].depositDate)
      if (d >= today) {
        nextIndex = i
        break
      }
    }

    const nextEntry = nextIndex >= 0 ? AISH_2026_PAYMENT_DATES[nextIndex] : null

    const allStatus = AISH_2026_PAYMENT_DATES.map((entry, i) => {
      const d = depositStart(entry.depositDate)
      if (d < today) return "past" as const
      if (i === nextIndex) return "next" as const
      return "future" as const
    })

    return { nextEntry, nextIndex, allStatus }
  }, [now])

  const countdown = nextEntry ? getCountdown(depositStart(nextEntry.depositDate), now) : null
  const isToday = nextEntry
    ? depositStart(nextEntry.depositDate).getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    : false

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---- HEADER ---- */}
      <header className="bg-white border-b border-gray-200 py-14">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="relative h-12 w-52">
              <Image
                src="/images/aish-logo.svg"
                alt="AISH – Assured Income for the Severely Handicapped"
                fill
                className="object-contain"
                sizes="208px"
                priority
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-tight">
              AISH Payment Dates 2026
            </h1>
            <p className="max-w-xl text-base text-gray-500 leading-relaxed">
              Alberta AISH payments are deposited on the <strong className="text-gray-700">last banking day of the previous month</strong>.
              Your July 2026 payment arrives June 30 — not July 1.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-3xl py-10 space-y-8">

        {/* ---- NEXT PAYMENT COUNTDOWN ---- */}
        {nextEntry && (
          <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-sm">
            <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Next AISH deposit</p>
                  <p className="text-base font-bold text-gray-900 leading-tight">{nextEntry.month} payment</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shrink-0">
                {nextEntry.label}
              </span>
            </div>

            <div className="p-6">
              {isToday ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <p className="font-semibold">Your AISH is being deposited today — check your bank account.</p>
                </div>
              ) : countdown ? (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4 text-center">Time until deposit</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { value: countdown.days,    label: "Days"    },
                      { value: countdown.hours,   label: "Hours"   },
                      { value: countdown.minutes, label: "Minutes" },
                      { value: countdown.seconds, label: "Seconds" },
                    ].map(({ value, label }) => (
                      <div key={label} className="flex flex-col items-center bg-gray-50 rounded-xl py-4 px-2 border border-gray-100">
                        <span className="text-3xl md:text-4xl font-bold text-gray-900 tabular-nums leading-none">
                          {pad(value)}
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mt-1.5">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center">Payment deposited</p>
              )}
            </div>
          </div>
        )}

        {!nextEntry && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-800">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
            <p className="font-semibold text-lg">All 2026 AISH payments have been deposited.</p>
            <p className="text-sm text-emerald-700 mt-1">2027 dates will be posted when confirmed by Alberta government.</p>
          </div>
        )}

        {/* ---- PAYMENT SCHEDULE TABLE ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Full 2026 AISH Deposit Schedule</h2>
          </div>

          <div className="divide-y divide-gray-50">
            {AISH_2026_PAYMENT_DATES.map((entry, i) => {
              const status = allStatus[i]
              return (
                <div
                  key={entry.month}
                  className={`flex items-center justify-between px-6 py-4 gap-4 ${
                    status === "next" ? "bg-emerald-50" : status === "past" ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {status === "past" && (
                      <CheckCircle2 className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    {status === "next" && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    )}
                    {status === "future" && (
                      <div className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${status === "next" ? "text-emerald-800" : "text-gray-900"}`}>
                        {entry.month}
                      </p>
                      {status === "past" && (
                        <p className="text-xs text-gray-400 mt-0.5">Deposited</p>
                      )}
                      {status === "next" && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Next payment</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-medium text-right ${
                      status === "next" ? "text-emerald-800" : status === "past" ? "text-gray-400" : "text-gray-700"
                    }`}>
                      {entry.label}
                    </span>
                    {status === "next" && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ---- KEY FACTS ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            Key facts about AISH payment timing
          </h2>
          <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>AISH is deposited on the <strong>last banking day of the previous month</strong>. Your July 2026 payment is deposited on June 30, 2026 — not July 1.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>If the last calendar day falls on a weekend or holiday, the deposit moves to the last available banking day before that. That&apos;s why June 2026 payment arrives May 29 (the last Friday before the weekend).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>AISH pays <strong>$1,940/month</strong> as the base benefit in 2026. Your amount may differ if you have children or employment income.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>Allow 1–2 business days for your financial institution to post the deposit, depending on your bank.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>If a payment is missing, contact Alberta Supports at <strong>1-877-644-9992</strong> or your local Alberta Supports Centre.</span>
            </li>
          </ul>
        </div>

        {/* ---- ADAP NOTICE (July 2026) ---- */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">What&apos;s changing in July 2026?</p>
            <p className="text-blue-800 leading-relaxed">
              Alberta is launching the Alberta Disability Assistance Program (ADAP) on July 1, 2026.
              AISH ($1,940/month) continues for clients assessed as permanently unable to work.
              New applicants may be placed in ADAP ($1,740/month) if assessed as able to work to some degree.
              Current AISH clients keep their $1,940 rate with a $200 transition bridge until at least December 2027.
            </p>
            <Link href="/tools/adap-calculator" className="inline-flex items-center gap-1.5 text-blue-700 font-semibold mt-2 hover:underline">
              Compare ADAP vs AISH <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ---- FAQ ---- */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">AISH payment date FAQ</h2>

          <div className="space-y-5">
            {[
              {
                q: "Why does my AISH arrive before the month it&apos;s for?",
                a: "Alberta deposits AISH on the last banking day of the previous month so that recipients have funds at the start of the month they&apos;re intended for. This has been the schedule for many years."
              },
              {
                q: "What if my AISH payment hasn&apos;t arrived?",
                a: "First check the schedule above to confirm the deposit date. If the deposit date has passed and your payment hasn&apos;t appeared, contact Alberta Supports at 1-877-644-9992. Processing times vary by bank — allow up to 2 business days after the listed deposit date."
              },
              {
                q: "How much is AISH in 2026?",
                a: "The AISH base benefit is $1,940 per month in 2026. If you have dependent children, you may receive an additional $232/month for the first child and $117/month for each additional child. Your net payment may be less if you have employment income above the $1,072/month exemption."
              },
              {
                q: "Will AISH payment dates change when ADAP launches in July 2026?",
                a: "No. The deposit schedule listed above covers all 12 months of 2026. Current AISH clients continue on the same payment timing. New ADAP applicants assessed after July 1 will follow the same last-banking-day-of-previous-month schedule."
              },
              {
                q: "What is the AISH income exemption for 2026?",
                a: "Single AISH clients can earn up to $1,072/month in net employment income without any reduction to their AISH. Between $1,072 and $2,009/month, 50% of employment income above $1,072 is deducted. Use the AISH Calculator to see your specific amount."
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-2" dangerouslySetInnerHTML={{ __html: q }} />
                <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- CTA TO AISH CALCULATOR ---- */}
        <Link href="/tools/aish-calculator" className="group block">
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 flex items-center gap-5 hover:shadow-lg hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-emerald-700 font-bold text-lg">$</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">AISH Calculator Alberta 2026</p>
              <p className="text-sm text-gray-500 mt-0.5">Estimate your monthly AISH payment based on employment income, children, and relationship status.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Disclaimer:</strong> Payment dates are based on the 2026 Alberta AISH deposit schedule.
            Actual deposit timing may vary by financial institution. Confirm your payment details with{" "}
            <a href="https://www.alberta.ca/aish" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Alberta Supports
            </a>{" "}
            or by calling 1-877-644-9992.
          </p>
        </div>

      </main>
    </div>
  )
}
