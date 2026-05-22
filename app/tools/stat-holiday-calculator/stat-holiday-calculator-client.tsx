"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft, ArrowRight, Calendar, Clock, Info, AlertCircle,
  Calculator, ChevronDown, ChevronUp, CheckCircle2
} from "lucide-react"

const STAT_HOLIDAYS_2026 = [
  { name: "New Year's Day",   date: "2026-01-01", display: "January 1, 2026",    day: "Thursday"  },
  { name: "Family Day",       date: "2026-02-16", display: "February 16, 2026",  day: "Monday"    },
  { name: "Good Friday",      date: "2026-04-03", display: "April 3, 2026",      day: "Friday"    },
  { name: "Victoria Day",     date: "2026-05-18", display: "May 18, 2026",       day: "Monday"    },
  { name: "Canada Day",       date: "2026-07-01", display: "July 1, 2026",       day: "Wednesday" },
  { name: "Labour Day",       date: "2026-09-07", display: "September 7, 2026",  day: "Monday"    },
  { name: "Thanksgiving Day", date: "2026-10-12", display: "October 12, 2026",   day: "Monday"    },
  { name: "Remembrance Day",  date: "2026-11-11", display: "November 11, 2026",  day: "Wednesday" },
  { name: "Christmas Day",    date: "2026-12-25", display: "December 25, 2026",  day: "Friday"    },
]

const FAQS = [
  {
    q: "Who is eligible for stat holiday pay in Alberta?",
    a: "Most employees covered by Alberta's Employment Standards Code qualify. You must have worked for the same employer for at least 30 days before the holiday, and must have worked your last scheduled shift before the holiday and your first scheduled shift after — unless you had a valid reason for missing either (such as illness or an approved absence).",
  },
  {
    q: "What is the formula for Alberta stat holiday pay?",
    a: "Alberta uses a simple average-daily-wage formula: add up all wages you earned in the 4 weeks immediately before the holiday and divide by 20. The number 20 represents the typical working days in a 4-week period (4 weeks × 5 days). This gives roughly your average daily wage. Wages include regular pay and commissions, but not overtime or tips.",
  },
  {
    q: "What happens if I work on a stat holiday?",
    a: "If you work on a general holiday you receive your regular wages for hours worked plus your general holiday pay (Option A). Alternatively, your employer may choose Option B: pay you 1.5× your regular rate for hours worked, then give you a substitute day off with pay equal to your general holiday pay. The employer decides which option to provide — you don't get to choose.",
  },
  {
    q: "Does overtime pay count in the 4-week wage calculation?",
    a: "No. Overtime pay is excluded from the 4-week earnings total when calculating Alberta general holiday pay. Only regular wages, salary, and commissions are included. If a significant portion of your income is overtime, your general holiday pay will be based on your regular earnings only.",
  },
  {
    q: "What are Alberta's 9 general (stat) holidays?",
    a: "Alberta recognizes 9 general holidays: New Year's Day (Jan 1), Family Day (3rd Monday of February), Good Friday (Friday before Easter), Victoria Day (Monday on or before May 25), Canada Day (Jul 1), Labour Day (first Monday of September), Thanksgiving Day (second Monday of October), Remembrance Day (Nov 11), and Christmas Day (Dec 25).",
  },
  {
    q: "My hours vary week to week — how do I calculate accurately?",
    a: "Use the 'Enter my 4-week wages manually' option. Add up every dollar you earned (excluding overtime and tips) in the 4 complete weeks immediately before the holiday. This is the most accurate approach for casual workers, shift workers, or anyone with variable hours — and it's exactly what Alberta's formula is designed for.",
  },
  {
    q: "Can my employer substitute a different day off instead of the stat?",
    a: "Yes. Employers and employees can agree in writing to substitute another day as the general holiday. The substitute day must occur within 30 days before or after the general holiday, or within a period agreed to in a collective agreement. The employee still receives general holiday pay on the substitute day.",
  },
]

function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })
}

export default function StatHolidayCalculatorClient() {
  const [payType, setPayType] = useState<"hourly" | "salary">("hourly")
  const [rawHourlyRate, setRawHourlyRate] = useState("")
  const [rawHoursPerWeek, setRawHoursPerWeek] = useState("")
  const [rawAnnualSalary, setRawAnnualSalary] = useState("")
  const [useCustomFourWeek, setUseCustomFourWeek] = useState(false)
  const [rawFourWeekWages, setRawFourWeekWages] = useState("")
  const [workedOnHoliday, setWorkedOnHoliday] = useState<"no" | "yes">("no")
  const [rawHoursWorked, setRawHoursWorked] = useState("")
  const [hasCalculated, setHasCalculated] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const hourlyRate = parseFloat(rawHourlyRate) || 0
  const hoursPerWeek = parseFloat(rawHoursPerWeek) || 0
  const annualSalary = parseFloat(rawAnnualSalary.replace(/,/g, "")) || 0
  const customFourWeek = parseFloat(rawFourWeekWages.replace(/,/g, "")) || 0
  const hoursWorked = parseFloat(rawHoursWorked) || 0

  // Equivalent hourly rate for salaried (used if worked on holiday)
  const equivHourly = useMemo(() => {
    if (payType === "salary" && annualSalary > 0 && hoursPerWeek > 0) {
      return annualSalary / 52 / hoursPerWeek
    }
    return hourlyRate
  }, [payType, annualSalary, hoursPerWeek, hourlyRate])

  const autoFourWeekWages = useMemo(() => {
    if (payType === "hourly") return hourlyRate * hoursPerWeek * 4
    return (annualSalary / 52) * 4
  }, [payType, hourlyRate, hoursPerWeek, annualSalary])

  const effectiveFourWeek = useCustomFourWeek ? customFourWeek : autoFourWeekWages

  const results = useMemo(() => {
    if (!hasCalculated || effectiveFourWeek <= 0) return null
    const generalHolidayPay = effectiveFourWeek / 20
    const workedPay = workedOnHoliday === "yes" && hoursWorked > 0 ? equivHourly * hoursWorked : 0
    const totalOwed = generalHolidayPay + workedPay
    const option1_5xPay = workedOnHoliday === "yes" && hoursWorked > 0 ? equivHourly * hoursWorked * 1.5 : 0
    const annualStatTotal = generalHolidayPay * 9
    return { generalHolidayPay, workedPay, totalOwed, option1_5xPay, annualStatTotal, effectiveFourWeek }
  }, [hasCalculated, effectiveFourWeek, workedOnHoliday, hoursWorked, equivHourly])

  // Next upcoming stat holiday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextHoliday = STAT_HOLIDAYS_2026.find(h => new Date(h.date) >= today) ?? null
  const daysUntil = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date).getTime() - today.getTime()) / 86400000)
    : null

  const canCalculate = (() => {
    if (useCustomFourWeek) return customFourWeek > 0
    if (payType === "hourly") return hourlyRate > 0 && hoursPerWeek > 0
    return annualSalary > 0
  })()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Back nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 max-w-5xl py-3">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Alberta Tools
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-13 h-13 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 p-3">
              <Calendar className="w-7 h-7 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Alberta Stat Holiday Pay Calculator
                </h1>
                <span className="text-[11px] font-semibold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                  2026 rules
                </span>
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  Free
                </span>
              </div>
              <p className="text-gray-500 leading-relaxed max-w-2xl text-sm sm:text-base">
                Find out exactly what you&apos;re owed under Alberta&apos;s Employment Standards Code for any of the 9 general holidays — whether you worked the day or not.
              </p>
            </div>
          </div>

          {/* Next holiday countdown */}
          {nextHoliday && daysUntil !== null && (
            <div className="mt-6 inline-flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm text-orange-800">
                <span className="font-semibold">{nextHoliday.name}</span> is{" "}
                {daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                <span className="text-orange-400"> · </span>
                <span className="text-orange-600">{nextHoliday.display} ({nextHoliday.day})</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-10">

        {/* Sticky mobile results */}
        {hasCalculated && results && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {workedOnHoliday === "yes" ? "Total holiday pay" : "General holiday pay"}
                </p>
                <p className="text-2xl font-bold text-orange-600">{fmt(results.totalOwed)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Per year (all 9 holidays)</p>
                <p className="text-lg font-bold text-gray-800">{fmt(results.annualStatTotal)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start pb-24 lg:pb-0">

          {/* ── INPUT PANEL ── */}
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Step 1: Pay details */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-white px-5 py-4 border-b border-orange-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Step 1 — Your Pay</p>
              </div>
              <div className="p-5 space-y-5">

                {/* Pay type toggle */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">How are you paid?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["hourly", "salary"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => { setPayType(type); setHasCalculated(false) }}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          payType === type
                            ? "border-orange-400 bg-orange-50 text-orange-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                        }`}
                      >
                        {type === "hourly" ? "Hourly" : "Salaried"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hourly fields */}
                {payType === "hourly" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Hourly wage</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rawHourlyRate}
                          onChange={e => { setRawHourlyRate(e.target.value); setHasCalculated(false) }}
                          placeholder="e.g. 22.50"
                          className="w-full pl-8 pr-14 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">/hr</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Typical hours per week</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rawHoursPerWeek}
                          onChange={e => { setRawHoursPerWeek(e.target.value); setHasCalculated(false) }}
                          placeholder="e.g. 40"
                          className="w-full pl-4 pr-14 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">hrs/wk</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Salary fields */}
                {payType === "salary" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Annual salary</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rawAnnualSalary}
                          onChange={e => { setRawAnnualSalary(e.target.value); setHasCalculated(false) }}
                          placeholder="e.g. 65,000"
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Typical hours per week
                        <span className="ml-1 text-xs font-normal text-gray-400">(needed if you worked the holiday)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rawHoursPerWeek}
                          onChange={e => { setRawHoursPerWeek(e.target.value); setHasCalculated(false) }}
                          placeholder="e.g. 37.5"
                          className="w-full pl-4 pr-14 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">hrs/wk</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Auto-preview */}
                {autoFourWeekWages > 0 && !useCustomFourWeek && (
                  <div className="bg-orange-50 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-orange-600 font-medium">Est. 4-week wages</span>
                    <span className="font-bold text-orange-800">{fmt(autoFourWeekWages)}</span>
                  </div>
                )}

                {/* Custom 4-week toggle */}
                <button
                  onClick={() => { setUseCustomFourWeek(!useCustomFourWeek); setHasCalculated(false) }}
                  className="text-xs text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors"
                >
                  {useCustomFourWeek
                    ? "← Use my hourly / salary calculation instead"
                    : "My hours vary — enter 4-week wages manually"}
                </button>

                {useCustomFourWeek && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Total wages earned in the 4 weeks before the holiday
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rawFourWeekWages}
                        onChange={e => { setRawFourWeekWages(e.target.value); setHasCalculated(false) }}
                        placeholder="e.g. 3,200"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Do not include overtime pay or tips
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Worked on holiday? */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-white px-5 py-4 border-b border-orange-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Step 2 — The Holiday</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Did you work on the stat holiday?</p>
                  <div className="space-y-2">
                    {([
                      { val: "no",  label: "No — I had the day off",      sub: "You receive general holiday pay" },
                      { val: "yes", label: "Yes — I worked the holiday",   sub: "You receive wages + holiday pay" },
                    ] as const).map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => { setWorkedOnHoliday(opt.val); setHasCalculated(false) }}
                        className={`w-full px-4 py-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          workedOnHoliday === opt.val
                            ? "border-orange-400 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          workedOnHoliday === opt.val ? "border-orange-500" : "border-gray-300"
                        }`}>
                          {workedOnHoliday === opt.val && (
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${workedOnHoliday === opt.val ? "text-orange-800" : "text-gray-700"}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {workedOnHoliday === "yes" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Hours worked on the holiday</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rawHoursWorked}
                        onChange={e => { setRawHoursWorked(e.target.value); setHasCalculated(false) }}
                        placeholder="e.g. 8"
                        className="w-full pl-4 pr-14 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">hrs</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calculate button */}
            <button
              onClick={() => setHasCalculated(true)}
              disabled={!canCalculate}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                canCalculate
                  ? "bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-sm hover:shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Calculator className="w-5 h-5" />
              Calculate my holiday pay
            </button>

            {!canCalculate && (
              <p className="text-xs text-center text-gray-400">
                {useCustomFourWeek ? "Enter your 4-week wages above" : payType === "hourly" ? "Enter your hourly rate and hours per week" : "Enter your annual salary"}
              </p>
            )}
          </div>

          {/* ── RESULTS PANEL ── */}
          <div className="space-y-5">

            {/* Placeholder */}
            {!hasCalculated && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-orange-200" />
                </div>
                <p className="text-gray-400 text-sm max-w-[240px] leading-relaxed">
                  Fill in your pay details and hit{" "}
                  <span className="font-semibold text-gray-500">Calculate</span> to see what you&apos;re owed.
                </p>
              </div>
            )}

            {/* Results */}
            {hasCalculated && results && (
              <>
                {/* Main result card */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-6">
                    <p className="text-orange-100 text-xs font-semibold uppercase tracking-wide mb-1">
                      {workedOnHoliday === "yes" ? "Your total holiday pay" : "Your general holiday pay"}
                    </p>
                    <p className="text-5xl font-bold text-white leading-none mb-2">{fmt(results.totalOwed)}</p>
                    <p className="text-orange-200 text-sm">
                      {workedOnHoliday === "yes" && hoursWorked > 0
                        ? `for working ${hoursWorked} hour${hoursWorked !== 1 ? "s" : ""} on the holiday`
                        : "for taking the holiday off"}
                    </p>
                  </div>

                  {/* Breakdown */}
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">How it breaks down</p>
                    <div className="divide-y divide-gray-50 text-sm">
                      {workedOnHoliday === "yes" && hoursWorked > 0 && (
                        <div className="flex items-start justify-between py-2.5 gap-3">
                          <span className="text-gray-500">
                            Regular wages
                            <span className="text-gray-400 ml-1 text-xs">
                              ({hoursWorked} hrs × {fmt(equivHourly)}/hr)
                            </span>
                          </span>
                          <span className="font-medium text-gray-900 shrink-0">{fmt(results.workedPay)}</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between py-2.5 gap-3">
                        <span className="text-gray-500">
                          General holiday pay
                          <span className="text-gray-400 ml-1 text-xs">
                            ({fmt(results.effectiveFourWeek)} ÷ 20)
                          </span>
                        </span>
                        <span className="font-medium text-gray-900 shrink-0">{fmt(results.generalHolidayPay)}</span>
                      </div>
                      <div className="flex justify-between pt-3 pb-1 font-semibold">
                        <span className="text-gray-900">Total you should receive</span>
                        <span className="text-orange-700 text-base">{fmt(results.totalOwed)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option B notice (if worked) */}
                {workedOnHoliday === "yes" && hoursWorked > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">Employer Option B</p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          Your employer may instead pay <strong>1.5× regular wages</strong> for hours worked (
                          {fmt(results.option1_5xPay)}) and give you a <strong>substitute day off</strong> worth{" "}
                          {fmt(results.generalHolidayPay)} in the future. The employer chooses which option to provide.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Annual projection */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5">Your Annual Stat Holiday Picture</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-orange-50 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mb-1">Per holiday</p>
                      <p className="text-3xl font-bold text-orange-700">{fmt(results.generalHolidayPay)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">All 9 holidays</p>
                      <p className="text-3xl font-bold text-gray-900">{fmt(results.annualStatTotal)}</p>
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 text-center">
                    General holiday pay × 9 Alberta stat holidays
                  </p>
                </div>

                {/* Eligibility reminder */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-amber-900">Eligibility check</p>
                      <ul className="text-xs text-amber-800 leading-relaxed space-y-1">
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          Must have worked for the same employer for at least <strong>30 days</strong> before the holiday
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          Must have worked your <strong>last scheduled shift before</strong> and <strong>first scheduled shift after</strong> the holiday
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          Missing shifts for <strong>valid reasons</strong> (illness, approved leave) generally still qualifies
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2026 Holiday schedule — always visible */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">2026 Alberta General Holidays</p>
                <span className="text-xs text-gray-400">9 holidays</span>
              </div>
              <div className="divide-y divide-gray-50">
                {STAT_HOLIDAYS_2026.map((h, i) => {
                  const hDate = new Date(h.date)
                  const isPast = hDate < today
                  const isNext = nextHoliday?.name === h.name && !isPast
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-6 py-3.5 text-sm ${isPast ? "opacity-35" : ""} ${isNext ? "bg-orange-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isNext ? "bg-orange-500" : isPast ? "bg-gray-200" : "bg-gray-300"}`} />
                        <span className={`font-medium ${isNext ? "text-orange-700" : "text-gray-800"}`}>{h.name}</span>
                        {isNext && (
                          <span className="text-[10px] font-semibold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                            Next up · {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className={`${isNext ? "text-orange-600" : "text-gray-500"}`}>{h.display}</span>
                        <span className="text-gray-400 text-xs ml-2 hidden sm:inline">{h.day}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
              <strong className="text-amber-900">Disclaimer:</strong> This calculator is for informational purposes only and does not constitute legal or employment advice. Actual entitlements may vary based on your employment contract, collective agreement, or specific circumstances. Verify with{" "}
              <span className="font-medium">Alberta Employment Standards</span> or a qualified professional.
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mt-14">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Explore more tools ── */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Explore More Alberta Tools</h2>
            <Link
              href="/tools"
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/tools/aish-calculator"
              className="group bg-white rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-lg transition-all p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">AISH Calculator</p>
                <p className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors text-sm">
                  Calculate your AISH payment
                </p>
                <p className="text-xs text-gray-400 mt-1">2026 rates · Child benefits · Clawback</p>
              </div>
              <div className="w-10 h-10 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 shrink-0 transition-colors">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
            <Link
              href="/tools/adap-calculator"
              className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">ADAP Calculator</p>
                <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm">
                  Compare ADAP vs AISH side by side
                </p>
                <p className="text-xs text-gray-400 mt-1">See the $200/month difference</p>
              </div>
              <div className="w-10 h-10 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 shrink-0 transition-colors">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

      </main>
    </div>
  )
}
