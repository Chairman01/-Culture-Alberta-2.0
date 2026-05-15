"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import { ArrowLeft, ArrowRight, Info, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react"

// ---------------------------------------------------------------------------
// 2026 AISH program constants (Alberta government — verify annually)
// ---------------------------------------------------------------------------
const AISH_BASE_SINGLE = 1940
const AISH_FIRST_CHILD = 232
const AISH_ADDITIONAL_CHILD = 117
const MONTHLY_EARNED_INCOME_EXEMPTION = 1072
const MONTHLY_PARTIAL_EXEMPTION_LIMIT = 2009
const MONTHLY_MAX_EARNED_INCOME_EXEMPTION = 1541
const FAMILY_MONTHLY_EARNED_INCOME_EXEMPTION = 2612
const FAMILY_MONTHLY_PARTIAL_EXEMPTION_LIMIT = 3349
const FAMILY_MONTHLY_MAX_EARNED_INCOME_EXEMPTION = 2981
const CLAWBACK_RATE = 0.5
const AISH_LOGO_IMAGE = "/images/aish-logo.svg"

// ---------------------------------------------------------------------------
// 2026 AISH payment deposit schedule
// Payments are deposited on the last banking day of the month before the payment month.
// ---------------------------------------------------------------------------
const AISH_2026_PAYMENT_DATES = [
  { month: "January 2026",   depositDate: new Date(2025, 11, 31) },
  { month: "February 2026",  depositDate: new Date(2026,  0, 30) },
  { month: "March 2026",     depositDate: new Date(2026,  1, 27) },
  { month: "April 2026",     depositDate: new Date(2026,  2, 31) },
  { month: "May 2026",       depositDate: new Date(2026,  3, 30) },
  { month: "June 2026",      depositDate: new Date(2026,  4, 29) },
  { month: "July 2026",      depositDate: new Date(2026,  5, 30) },
  { month: "August 2026",    depositDate: new Date(2026,  6, 31) },
  { month: "September 2026", depositDate: new Date(2026,  7, 31) },
  { month: "October 2026",   depositDate: new Date(2026,  8, 30) },
  { month: "November 2026",  depositDate: new Date(2026,  9, 30) },
  { month: "December 2026",  depositDate: new Date(2026, 10, 30) },
]

const relatedArticles = [
  {
    href: "/articles/aish-vs-cpp-disability-in-alberta-which-program-should-you-apply-for",
    image: "https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1777224560270-nyzmgn.jpg",
    title: "AISH vs CPP Disability in Alberta: Which Program Should You Apply For?",
    description:
      "A plain-language comparison of eligibility, payment amounts, and what happens if you qualify for both.",
  },
  {
    href: "/articles/aish-payments-in-alberta-2026-how-much-you-get-when-it-arrives-and-whats-changing-in-july",
    image: "https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1776632299965-2pipcg.jpg",
    title: "AISH Payments in Alberta 2026: How Much You Get, When It Arrives, and What's Changing in July",
    description:
      "The 2026 payment amount, deposit timing, and the July disability support changes Albertans should know.",
  },
]

// ---------------------------------------------------------------------------
// 2026 Tax constants (simplified estimate — does not include CPP/EI)
// ---------------------------------------------------------------------------
const FED_BPA_ANNUAL = 16129   // federal basic personal amount
const AB_BPA_ANNUAL = 21003    // Alberta basic personal amount
const FED_RATE = 0.15          // first federal bracket
const AB_RATE = 0.10           // Alberta flat rate (first bracket)

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })
}
function fmtShort(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
}

function getChildBenefit(dependentChildren: number) {
  if (dependentChildren <= 0) return 0
  return AISH_FIRST_CHILD + Math.max(0, dependentChildren - 1) * AISH_ADDITIONAL_CHILD
}

function getEmploymentIncomeExemption(monthlyEmploymentIncome: number, exemptionType: "single" | "family") {
  const fullExemption = exemptionType === "family"
    ? FAMILY_MONTHLY_EARNED_INCOME_EXEMPTION
    : MONTHLY_EARNED_INCOME_EXEMPTION
  const partialLimit = exemptionType === "family"
    ? FAMILY_MONTHLY_PARTIAL_EXEMPTION_LIMIT
    : MONTHLY_PARTIAL_EXEMPTION_LIMIT
  const maxExemption = exemptionType === "family"
    ? FAMILY_MONTHLY_MAX_EARNED_INCOME_EXEMPTION
    : MONTHLY_MAX_EARNED_INCOME_EXEMPTION

  if (monthlyEmploymentIncome <= fullExemption) {
    return monthlyEmploymentIncome
  }

  if (monthlyEmploymentIncome <= partialLimit) {
    return fullExemption + (monthlyEmploymentIncome - fullExemption) * CLAWBACK_RATE
  }

  return maxExemption
}

function calculateAISH(inputs: {
  dependentChildren: number
  monthlyEmploymentIncome: number
  partnerMonthlyEmploymentIncome: number
  exemptionType: "single" | "family"
}) {
  const {
    dependentChildren,
    monthlyEmploymentIncome,
    partnerMonthlyEmploymentIncome,
    exemptionType,
  } = inputs

  const baseMonthly = AISH_BASE_SINGLE
  const childSupplement = getChildBenefit(dependentChildren)
  const grossMonthly = baseMonthly + childSupplement
  const householdEmploymentIncome = monthlyEmploymentIncome + partnerMonthlyEmploymentIncome

  const exemptionApplied = getEmploymentIncomeExemption(householdEmploymentIncome, exemptionType)
  const clawback = Math.max(0, householdEmploymentIncome - exemptionApplied)
  const netMonthly = Math.max(0, grossMonthly - clawback)
  const annualBenefit = netMonthly * 12

  // Estimated income tax on employment income only (AISH is tax-free)
  const annualEmployment = householdEmploymentIncome * 12
  const fedTaxable = Math.max(0, annualEmployment - FED_BPA_ANNUAL)
  const abTaxable = Math.max(0, annualEmployment - AB_BPA_ANNUAL)
  const annualTax = fedTaxable * FED_RATE + abTaxable * AB_RATE
  const monthlyTax = annualTax / 12
  const afterTaxEmployment = Math.max(0, monthlyEmploymentIncome - monthlyTax)

  const totalMonthlyTakeHome = netMonthly + afterTaxEmployment
  const totalAnnualTakeHome = totalMonthlyTakeHome * 12

  return {
    baseMonthly,
    childSupplement,
    grossMonthly,
    householdEmploymentIncome,
    exemptionApplied,
    clawback,
    netMonthly,
    annualBenefit,
    fullyClawedBack: netMonthly === 0 && grossMonthly > 0,
    monthlyTax,
    afterTaxEmployment,
    totalMonthlyTakeHome,
    totalAnnualTakeHome,
  }
}

// ---------------------------------------------------------------------------
// SVG Donut Chart
// ---------------------------------------------------------------------------
function DonutChart({
  netMonthly,
  clawback,
  grossMonthly,
}: {
  netMonthly: number
  clawback: number
  grossMonthly: number
}) {
  const r = 42
  const cx = 56
  const cy = 56
  const circumference = 2 * Math.PI * r

  const keepFraction = grossMonthly > 0 ? Math.max(0, netMonthly / grossMonthly) : 1
  const clawFraction = grossMonthly > 0 ? Math.min(clawback / grossMonthly, 1) : 0

  const keepDash = keepFraction * circumference
  const clawDash = clawFraction * circumference

  return (
    <svg viewBox="0 0 112 112" className="w-full h-full">
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
      {/* Net AISH — emerald, starts from top */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth="12"
        strokeDasharray={`${keepDash} ${circumference}`}
        transform={`rotate(-90, ${cx}, ${cy})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      {/* Clawback — red */}
      {clawFraction > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#f87171"
          strokeWidth="12"
          strokeDasharray={`${clawDash} ${circumference}`}
          transform={`rotate(${-90 + keepFraction * 360}, ${cx}, ${cy})`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function AISHCalculatorPage() {
  const [maritalStatus, setMaritalStatus] = useState("single")
  const [dependentChildren, setDependentChildren] = useState(0)
  const [rawIncome, setRawIncome] = useState("")
  const [rawPartnerIncome, setRawPartnerIncome] = useState("")
  const [feedback, setFeedback] = useState("Start with your situation, then calculate your estimate.")
  const [hasCalculated, setHasCalculated] = useState(false)

  const markChanged = (message: string) => {
    setFeedback(message)
    setHasCalculated(false)
  }

  const monthlyEmploymentIncome = Math.max(0, parseFloat(rawIncome) || 0)
  const partnerMonthlyEmploymentIncome = maritalStatus === "single"
    ? 0
    : Math.max(0, parseFloat(rawPartnerIncome) || 0)
  const exemptionType = maritalStatus === "single" ? "single" : "family"
  const fullEmploymentExemption = exemptionType === "family"
    ? FAMILY_MONTHLY_EARNED_INCOME_EXEMPTION
    : MONTHLY_EARNED_INCOME_EXEMPTION
  const partialEmploymentLimit = exemptionType === "family"
    ? FAMILY_MONTHLY_PARTIAL_EXEMPTION_LIMIT
    : MONTHLY_PARTIAL_EXEMPTION_LIMIT
  const maxEmploymentExemption = exemptionType === "family"
    ? FAMILY_MONTHLY_MAX_EARNED_INCOME_EXEMPTION
    : MONTHLY_MAX_EARNED_INCOME_EXEMPTION

  const result = useMemo(
    () => calculateAISH({
      dependentChildren,
      monthlyEmploymentIncome,
      partnerMonthlyEmploymentIncome,
      exemptionType,
    }),
    [dependentChildren, monthlyEmploymentIncome, partnerMonthlyEmploymentIncome, exemptionType]
  )
  const breakEvenEmploymentIncome = result.grossMonthly + maxEmploymentExemption
  const canCalculate = true

  const keepPct = result.grossMonthly > 0
    ? Math.round((result.netMonthly / result.grossMonthly) * 100)
    : 100
  const clawPct = 100 - keepPct

  // Payment schedule — computed on client (client component, no SSR mismatch risk for date highlight)
  const scheduleToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const nextPayment = useMemo(
    () => AISH_2026_PAYMENT_DATES.find(p => p.depositDate >= scheduleToday) ?? null,
    [scheduleToday]
  )
  const daysUntilPayment = useMemo(
    () => nextPayment
      ? Math.round((nextPayment.depositDate.getTime() - scheduleToday.getTime()) / 86400000)
      : null,
    [nextPayment, scheduleToday]
  )

  // Plain-language context
  const context = useMemo(() => {
    if (result.fullyClawedBack)
      return { type: "warn" as const, text: `At ${fmt(result.householdEmploymentIncome)}/month household employment income, your AISH is fully offset. You keep the wages but receive no AISH in this estimate.` }
    if (result.householdEmploymentIncome === 0)
      return { type: "good" as const, text: `With no employment income, you receive the full ${fmt(result.grossMonthly)}/month.` }
    if (result.householdEmploymentIncome <= fullEmploymentExemption)
      return { type: "good" as const, text: `Your household employment income is within the ${exemptionType} fully exempt range. It does not reduce your AISH.` }
    if (result.householdEmploymentIncome <= partialEmploymentLimit)
      return { type: "neutral" as const, text: `${fmt(result.exemptionApplied)} of your employment income is exempt. The remaining ${fmt(result.clawback)} is deducted from your monthly AISH.` }
    return { type: "neutral" as const, text: `Your employment income is above the monthly exemption cap. ${fmt(result.exemptionApplied)} is exempt and ${fmt(result.clawback)} is deducted from your AISH.` }
  }, [result, exemptionType, fullEmploymentExemption, partialEmploymentLimit])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Back nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl py-3">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Tools
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="space-y-6">
            <div>
              <span className="inline-block text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full mb-3">
                Free Calculator · 2026 Rates
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                AISH Calculator Alberta
              </h1>
              <p className="text-gray-500 text-base max-w-xl leading-relaxed">
                Estimate your monthly AISH payment, child benefit, income exemption, clawback, and take-home income using 2026 Alberta rates.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,640px)_1fr] lg:items-center">
              <div className="relative aspect-[735/160] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <Image
                  src={AISH_LOGO_IMAGE}
                  alt="AISH - Assured Income for the Severely Handicapped"
                  fill
                  priority
                  className="object-contain p-3 sm:p-5"
                  sizes="(max-width: 1024px) 100vw, 640px"
                />
              </div>

            </div>
          </div>
        </div>
      </header>

      <section className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl py-6">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] items-start">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                What is AISH?
              </p>
              <p className="text-sm leading-relaxed text-gray-700">
                AISH stands for Assured Income for the Severely Handicapped. It is an Alberta
                government program that provides financial and health benefits to eligible adult
                Albertans with a permanent medical condition that prevents them from earning a
                living. This calculator estimates the monthly living allowance portion before an
                official AISH worker reviews your full situation.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
                Important
              </p>
              <p className="text-sm leading-relaxed text-amber-900">
                AISH looks at more than employment income, including spouse or partner income,
                non-exempt assets, CPP Disability, EI, WCB, and other benefits. Use this as a
                planning estimate, then confirm with Alberta Supports.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="lg:hidden sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto px-4 max-w-6xl py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Estimated monthly AISH
              </p>
              <p className="text-2xl font-bold leading-tight text-gray-900">
                {fmtShort(result.netMonthly)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHasCalculated(true)}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
            >
              Save estimate
            </button>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

          {/* ========== LEFT: INPUTS (sticky) ========== */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Your Situation</h2>

              {/* Marital status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Relationship status</label>
                <div className="space-y-2">
                  {[
                    { value: "single", label: "Single" },
                    { value: "married", label: "Married / Common-law" },
                    { value: "married-both", label: "Married — both on AISH" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setMaritalStatus(opt.value)
                        markChanged(
                          opt.value === "single"
                            ? "Relationship status set to single. The calculator will use single income exemptions."
                            : "Relationship status updated. The calculator will use family income exemptions and include partner income."
                        )
                      }}
                      className={`w-full px-4 py-3 rounded-lg border text-sm font-medium text-left flex items-center gap-3 transition-all ${
                        maritalStatus === opt.value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        maritalStatus === opt.value ? "border-white" : "border-gray-300"
                      }`}>
                        {maritalStatus === opt.value && (
                          <span className="w-2 h-2 rounded-full bg-white block" />
                        )}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {maritalStatus === "married" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 mt-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    AISH uses family income exemptions when you have a spouse or common-law partner.
                  </p>
                )}
                {maritalStatus === "married-both" && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2 mt-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    If both partners receive AISH, each partner may have their own file. This tool estimates one recipient&apos;s payment using the family income exemption.
                  </p>
                )}
              </div>

              {/* Dependent children */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Dependent children
                  <span className="ml-1.5 text-gray-400 font-normal text-xs">(+{fmt(AISH_FIRST_CHILD)} first child, +{fmt(AISH_ADDITIONAL_CHILD)} after)</span>
                </label>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, dependentChildren - 1)
                      setDependentChildren(next)
                      markChanged(`Dependent children updated to ${next}.`)
                    }}
                    className="w-12 h-12 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-700 font-semibold text-xl flex items-center justify-center transition-colors"
                    aria-label="Decrease"
                  >−</button>
                  <span className="w-14 text-center text-lg font-bold text-gray-900">{dependentChildren}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(8, dependentChildren + 1)
                      setDependentChildren(next)
                      markChanged(`Dependent children updated to ${next}.`)
                    }}
                    className="w-12 h-12 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-700 font-semibold text-xl flex items-center justify-center transition-colors"
                    aria-label="Increase"
                  >+</button>
                </div>
                {dependentChildren > 0 && (
                  <p className="text-xs text-emerald-700">+{fmt(getChildBenefit(dependentChildren))}/month added</p>
                )}
              </div>

              {/* Employment income */}
              <div className="space-y-2">
                <label htmlFor="income" className="block text-sm font-medium text-gray-700">
                  Monthly employment income
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-base">$</span>
                  <input
                    id="income"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={rawIncome}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^0-9.]/g, "")
                      setRawIncome(next)
                      markChanged(next ? `Your employment income is set to ${fmt(parseFloat(next) || 0)} per month.` : "Your employment income was cleared.")
                    }}
                    className="w-full pl-8 pr-4 py-3.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400">First {fmt(fullEmploymentExemption)}/month is fully exempt for this relationship status</p>
              </div>

              {maritalStatus !== "single" && (
                <div className="space-y-2">
                  <label htmlFor="partner-income" className="block text-sm font-medium text-gray-700">
                    Spouse / partner monthly employment income
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-base">$</span>
                    <input
                      id="partner-income"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={rawPartnerIncome}
                      onChange={(e) => {
                        const next = e.target.value.replace(/[^0-9.]/g, "")
                        setRawPartnerIncome(next)
                        markChanged(next ? `Partner employment income is set to ${fmt(parseFloat(next) || 0)} per month.` : "Partner employment income was cleared.")
                      }}
                      className="w-full pl-8 pr-4 py-3.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Family exemption: first {fmt(FAMILY_MONTHLY_EARNED_INCOME_EXEMPTION)}/month fully exempt, maximum {fmt(FAMILY_MONTHLY_MAX_EARNED_INCOME_EXEMPTION)}/month exempt.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-medium">Current update</p>
                <p className="mt-1 text-blue-800">{feedback}</p>
              </div>

              <button
                type="button"
                disabled={!canCalculate}
                onClick={() => {
                  setHasCalculated(true)
                  setFeedback(`Estimate calculated: ${fmt(result.netMonthly)} per month in AISH before final government review.`)
                }}
                className="w-full rounded-lg bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Calculate my AISH estimate
              </button>
            </div>

            {/* How it works — collapsible */}
            <details className="bg-white rounded-xl border border-gray-200 group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-gray-900">How the calculation works</span>
                <span className="text-gray-400 text-lg leading-none group-open:rotate-45 transition-transform inline-block">+</span>
              </summary>
              <div className="px-5 pb-5 pt-3 space-y-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                <p><strong className="text-gray-800">Living allowance:</strong> The standard 2026 AISH living allowance is {fmt(AISH_BASE_SINGLE)}/month before income reductions.</p>
                <p><strong className="text-gray-800">Child benefit:</strong> AISH may add {fmt(AISH_FIRST_CHILD)}/month for the first dependent child and {fmt(AISH_ADDITIONAL_CHILD)}/month for each additional dependent child.</p>
                <p><strong className="text-gray-800">Employment exemption:</strong> Singles can have up to {fmt(MONTHLY_EARNED_INCOME_EXEMPTION)} fully exempt, to a maximum exemption of {fmt(MONTHLY_MAX_EARNED_INCOME_EXEMPTION)}. Families can have up to {fmt(FAMILY_MONTHLY_EARNED_INCOME_EXEMPTION)} fully exempt, to a maximum exemption of {fmt(FAMILY_MONTHLY_MAX_EARNED_INCOME_EXEMPTION)}.</p>
                <p><strong className="text-gray-800">Clawback:</strong> Employment income left after the exemption is deducted from the AISH living allowance.</p>
                <p><strong className="text-gray-800">Taxes:</strong> AISH payments are <em>not</em> taxable income. Only employment earnings are subject to federal and Alberta income tax.</p>
              </div>
            </details>
          </div>

          {/* ========== RIGHT: RESULTS ========== */}
          <div className="space-y-4">

            {/* Context message */}
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm font-medium ${
              context.type === "warn"
                ? "bg-red-50 border border-red-200 text-red-800"
                : context.type === "good"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-blue-50 border border-blue-200 text-blue-800"
            }`}>
              {context.type === "warn"
                ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              }
              <p className="font-normal">{context.text}</p>
            </div>

            {/* Main result card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Big numbers + donut */}
              <div className="p-6 flex items-center gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Your estimated AISH</p>
                    <p className="text-5xl font-bold text-gray-900 leading-none tracking-tight">
                      {fmtShort(result.netMonthly)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1.5">per month</p>
                  </div>
                  <div className="flex items-center gap-5 flex-wrap">
                    <div>
                      <p className="text-xl font-bold text-gray-700">{fmtShort(result.annualBenefit)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">per year</p>
                    </div>
                    {result.clawback > 0 && !result.fullyClawedBack && (
                      <>
                        <div className="w-px h-8 bg-gray-100" />
                        <div>
                          <p className="text-xl font-bold text-red-400">−{fmtShort(result.clawback)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">clawback / mo</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Donut chart */}
                <div className="relative w-[120px] h-[120px] shrink-0">
                  <DonutChart
                    netMonthly={result.netMonthly}
                    clawback={result.clawback}
                    grossMonthly={result.grossMonthly}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-emerald-600">{keepPct}%</span>
                    <span className="text-[10px] text-gray-400 leading-none">kept</span>
                  </div>
                </div>
              </div>

              {/* Breakdown bar */}
              <div className="px-6 pb-6 border-t border-gray-50 pt-4 space-y-2.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">AISH benefit breakdown</p>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                  <div
                    className="bg-emerald-400 rounded-l-full transition-all duration-500"
                    style={{ width: `${keepPct}%` }}
                  />
                  {clawPct > 0 && (
                    <div
                      className="bg-red-400 rounded-r-full transition-all duration-500"
                      style={{ width: `${clawPct}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block shrink-0" />
                    You receive {fmt(result.netMonthly)}
                  </span>
                  {result.clawback > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block shrink-0" />
                      Clawback −{fmt(result.clawback)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line-item breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Calculation breakdown</p>
              <div className="divide-y divide-gray-50">
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-500">Base AISH benefit</span>
                  <span className="font-medium text-gray-900">{fmt(result.baseMonthly)}/mo</span>
                </div>
                {result.childSupplement > 0 && (
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Child benefit ({dependentChildren} dependent {dependentChildren === 1 ? "child" : "children"})</span>
                    <span className="font-medium text-emerald-700">+{fmt(result.childSupplement)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="font-medium text-gray-700">Gross AISH benefit</span>
                  <span className="font-semibold text-gray-900">{fmt(result.grossMonthly)}/mo</span>
                </div>
                {result.householdEmploymentIncome > 0 && (
                  <>
                    <div className="flex justify-between py-2.5 text-sm text-gray-400">
                      <span>Employment income earned</span>
                      <span>{fmt(monthlyEmploymentIncome)}</span>
                    </div>
                    {partnerMonthlyEmploymentIncome > 0 && (
                      <div className="flex justify-between py-2.5 text-sm text-gray-400">
                        <span>Spouse / partner employment income</span>
                        <span>{fmt(partnerMonthlyEmploymentIncome)}</span>
                      </div>
                    )}
                    {partnerMonthlyEmploymentIncome > 0 && (
                      <div className="flex justify-between py-2.5 text-sm text-gray-400">
                        <span>Household employment income</span>
                        <span>{fmt(result.householdEmploymentIncome)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2.5 text-sm text-gray-400">
                      <span>Employment income exemption applied</span>
                      <span>−{fmt(result.exemptionApplied)}</span>
                    </div>
                    {result.clawback > 0 && (
                      <div className="flex justify-between py-2.5 text-sm">
                        <span className="text-gray-500">Income counted against AISH after exemption</span>
                        <span className="font-medium text-red-500">−{fmt(result.clawback)}/mo</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-4 pb-1">
                  <span className="font-bold text-gray-900">Net monthly AISH</span>
                  <span className="text-xl font-bold text-gray-900">{fmt(result.netMonthly)}</span>
                </div>
              </div>
            </div>

            {/* ---- TOTAL INCOME PICTURE (after tax) ---- */}
            {result.householdEmploymentIncome > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total monthly income picture</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Estimate</span>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex justify-between py-2.5 text-sm">
                    <div>
                      <span className="text-gray-700 font-medium">AISH benefit</span>
                      <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">tax-free</span>
                    </div>
                    <span className="font-medium text-gray-900">{fmt(result.netMonthly)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Household employment income (gross)</span>
                    <span className="text-gray-700">{fmt(result.householdEmploymentIncome)}</span>
                  </div>
                  {result.monthlyTax > 0 && (
                    <div className="flex justify-between py-2.5 text-sm">
                      <div>
                        <span className="text-gray-500">Estimated income tax</span>
                        <p className="text-xs text-gray-400 mt-0.5">Federal + Alberta — does not include CPP/EI</p>
                      </div>
                      <span className="text-red-500 font-medium">−{fmt(result.monthlyTax)}</span>
                    </div>
                  )}
                  {result.monthlyTax === 0 && (
                    <div className="flex justify-between py-2.5 text-sm text-gray-400">
                      <span>Estimated income tax</span>
                      <span>$0.00 (below basic personal amount)</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 pb-1">
                    <div>
                      <span className="font-bold text-gray-900">Estimated take-home</span>
                      <p className="text-xs text-gray-400 mt-0.5">AISH + after-tax household employment income</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{fmt(result.totalMonthlyTakeHome)}</p>
                      <p className="text-xs text-gray-400">{fmtShort(result.totalAnnualTakeHome)}/year</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-50 leading-relaxed">
                  Tax estimate uses 2026 federal (15%) and Alberta (10%) rates on income above the basic personal amounts ({fmt(FED_BPA_ANNUAL / 12)}/mo federal, {fmt(AB_BPA_ANNUAL / 12)}/mo Alberta). CPP contributions and EI premiums are not included — they would reduce take-home slightly.
                </p>
              </div>
            )}

            {/* Break-even */}
            {!result.fullyClawedBack && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-600">
                <strong className="text-gray-800">Break-even point: </strong>
                At about {fmt(breakEvenEmploymentIncome)}/month employment income, your AISH estimate reaches zero under the 2026 exemption cap. Below that, work income may still increase your overall income.
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>Disclaimer:</strong> Estimates only. Actual benefits and taxes depend on your full financial situation, filing status, and deductions not covered here. Always confirm final numbers with Alberta Supports or a qualified professional.
              </p>
            </div>

            {/* ---- AISH 2026 PAYMENT DATE SCHEDULE ---- */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">2026 AISH Payment Dates</p>
                <p className="text-xs text-gray-500 mt-1">Deposits are sent on the last banking day of the month before each payment month.</p>
              </div>

              {/* Next payment countdown */}
              {nextPayment && (
                <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">Next deposit</p>
                    <p className="text-xl font-bold text-gray-900">
                      {nextPayment.depositDate.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-sm text-emerald-700 mt-0.5">{nextPayment.month} payment</p>
                  </div>
                  {daysUntilPayment !== null && (
                    <div className="text-center shrink-0">
                      <p className="text-4xl font-bold text-emerald-600 leading-none tabular-nums">
                        {daysUntilPayment === 0 ? "Today" : daysUntilPayment}
                      </p>
                      {daysUntilPayment > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">
                          {daysUntilPayment === 1 ? "day away" : "days away"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Full schedule list */}
              <div className="divide-y divide-gray-50">
                {AISH_2026_PAYMENT_DATES.map((p) => {
                  const isPast = p.depositDate < scheduleToday
                  const isNext = nextPayment?.month === p.month
                  return (
                    <div
                      key={p.month}
                      className={`flex items-center justify-between px-5 py-2.5 text-sm ${isNext ? "bg-emerald-50" : ""}`}
                    >
                      <span className={
                        isPast ? "text-gray-400"
                        : isNext ? "font-semibold text-emerald-900"
                        : "text-gray-700"
                      }>
                        {p.month}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium tabular-nums ${
                          isPast ? "text-gray-400 line-through"
                          : isNext ? "text-emerald-700"
                          : "text-gray-900"
                        }`}>
                          {p.depositDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {isPast && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        )}
                        {isNext && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Next
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong>New applicants:</strong> AISH processing typically takes 3–6 months after you apply. Your first payment will be deposited on the next scheduled date after your application is approved.
                </p>
              </div>
            </div>

            {hasCalculated && (
              <div className="rounded-xl border border-gray-900 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Keep this handy
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  Get Alberta benefit updates in your inbox
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  AISH rules and the July 2026 disability support changes can affect payments.
                  Join Culture Alberta for plain-language updates, payment reminders, and new
                  calculators as they go live.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                  >
                    Sign up for a Culture Alberta account
                  </Link>
                  <Link
                    href="/#newsletter"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
                  >
                    Join the newsletter
                  </Link>
                </div>
              </div>
            )}

            {/* Related articles */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Related Reading</p>
              <div className="divide-y divide-gray-100">
                {relatedArticles.map((article) => (
                  <Link
                    key={article.href}
                    href={article.href}
                    className="group grid grid-cols-[72px_1fr] items-center gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[96px_1fr_auto] sm:gap-4"
                  >
                    <div className="relative h-16 w-[72px] overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-24">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="96px"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:underline leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {article.description}
                      </p>
                    </div>
                    <ArrowRight className="hidden w-4 h-4 text-gray-400 shrink-0 group-hover:translate-x-1 transition-transform sm:block" />
                  </Link>
                ))}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}
