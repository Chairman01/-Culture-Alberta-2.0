"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Info,
  CheckCircle2,
  Newspaper,
} from "lucide-react"

import {
  ADAP_LIVING_ALLOWANCE,
  ADAP_BENEFIT_END_ANNUAL_INCOME,
  ADAP_EXEMPTION_SINGLE,
  ADAP_EXEMPTION_WITH_CHILDREN,
  ADAP_EXEMPTION_COHABITING,
  AISH_LIVING_ALLOWANCE,
  AISH_EMPLOYMENT_EXEMPTION,
  CHILD_BENEFIT_TIERS,
  COUPLE_BOTH_ON_DISABILITY_RATE,
  calculateAdap,
  calculateAish,
  getChildBenefit,
} from "@/lib/disability-benefits"

// Rates live in lib/disability-benefits.ts — see that file for sources, for the
// August 2026 changes (recalibrated child benefit, 88% couples rule), and for
// why ADAP's income reduction above the exemption is a modelled approximation.
const ADAP_BASE_SINGLE = ADAP_LIVING_ALLOWANCE
const AISH_BASE_SINGLE = AISH_LIVING_ALLOWANCE
const MONTHLY_EARNED_INCOME_EXEMPTION = AISH_EMPLOYMENT_EXEMPTION.single.full

const ADAP_LOGO_IMAGE = "/images/adap-logo.svg"

/** Plain-language summary of the tiered child benefit, e.g. "$300 · $117 · …" */
const CHILD_TIER_SUMMARY = CHILD_BENEFIT_TIERS.map((t) => `$${t}`).join(" · ")

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 })
}
function fmtShort(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
}

// ---------------------------------------------------------------------------
// Core calculation — compares ADAP and AISH side by side
// ---------------------------------------------------------------------------
function calculateComparison({
  myIncome, partnerIncome, children, exemptionType, partnerOnDisabilityAssistance,
}: {
  myIncome: number
  partnerIncome: number
  children: number
  exemptionType: "single" | "family"
  partnerOnDisabilityAssistance: boolean
}) {
  const adap = calculateAdap({
    children,
    monthlyIncome: myIncome,
    partnerMonthlyIncome: partnerIncome,
    partnerOnDisabilityAssistance,
  })

  const aish = calculateAish({
    children,
    monthlyIncome: myIncome,
    partnerMonthlyIncome: partnerIncome,
    exemptionType,
    partnerOnDisabilityAssistance,
  })

  // ---- DIFFERENCE (AISH - ADAP) ----
  const monthlyDiff = aish.netBenefit - adap.netBenefit

  return {
    household: aish.householdIncome,

    adapBase: adap.livingAllowance,
    adapGross: adap.grossBenefit,
    adapExemption: adap.exemption,
    adapExcess: Math.max(0, adap.householdIncome - adap.exemption),
    adapClawback: adap.reduction,
    adapBenefit: adap.netBenefit,
    adapFullyClawedBack: adap.fullyReduced,

    aishBase: aish.livingAllowance,
    childBonus: aish.childBenefit,
    grossAISH: aish.grossBenefit,
    aishExemption: aish.exemption,
    aishClawback: aish.reduction,
    aishBenefit: aish.netBenefit,
    aishFullyClawedBack: aish.fullyReduced,

    coupleRateApplied: aish.coupleRateApplied,
    monthlyDiff,
    annualDiff: monthlyDiff * 12,
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ADAPCalculatorClient() {
  const [maritalStatus, setMaritalStatus]       = useState("single")
  const [partnerOnDA, setPartnerOnDA]           = useState(false)
  const [children, setChildren]                 = useState(0)
  const [rawIncome, setRawIncome]               = useState("")
  const [rawPartnerIncome, setRawPartnerIncome] = useState("")
  const [hasCalculated, setHasCalculated]       = useState(false)

  const myIncome      = Math.max(0, parseFloat(rawIncome) || 0)
  const partnerIncome = maritalStatus === "single" ? 0 : Math.max(0, parseFloat(rawPartnerIncome) || 0)
  const exemptionType: "single" | "family" = maritalStatus === "single" ? "single" : "family"

  // The 88% couples rule and ADAP's $1,500 cohabiting exemption only apply when
  // the partner also receives AISH or ADAP.
  const partnerOnDisabilityAssistance = maritalStatus !== "single" && partnerOnDA

  const result = useMemo(
    () => calculateComparison({
      myIncome, partnerIncome, children, exemptionType, partnerOnDisabilityAssistance,
    }),
    [myIncome, partnerIncome, children, exemptionType, partnerOnDisabilityAssistance]
  )

  const diffDir = result.monthlyDiff > 0.5 ? "aish" : result.monthlyDiff < -0.5 ? "adap" : "same"

  const handleChange = (fn: () => void) => { fn(); setHasCalculated(false) }

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
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div>
            <span className="inline-block text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full mb-3">
              Free Calculator · 2026 Rates · Rough Estimate
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              ADAP Calculator Alberta 2026
            </h1>
            <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
              See how much ADAP pays, how much AISH pays, and the monthly difference between
              the two programs based on your employment income.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,640px)_1fr] lg:items-center">
            <a
              href="#calculator"
              className="relative aspect-[735/160] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm block hover:border-blue-300 hover:shadow-md transition-all group"
              aria-label="Go to ADAP calculator"
              title="Click to jump to the calculator"
            >
              <Image
                src={ADAP_LOGO_IMAGE}
                alt="ADAP – Alberta Disability Assistance Program"
                fill
                priority
                className="object-contain p-3 sm:p-5"
                sizes="(max-width: 1024px) 100vw, 640px"
              />
              <span className="absolute bottom-2 right-2 text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Go to calculator ↓
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* Info banners */}
      <section className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl py-6 space-y-4">

          {/* Two-program explainer */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">ADAP — new July 2026</p>
              <p className="text-sm leading-relaxed text-blue-900">
                <strong>{fmt(ADAP_LIVING_ALLOWANCE)}/month</strong> living allowance. For Albertans with a severe and permanent
                disability who are assessed as able to work to some degree. Employment income is fully exempt up to{" "}
                <strong>{fmtShort(ADAP_EXEMPTION_SINGLE)}/month</strong> for single clients,{" "}
                <strong>{fmtShort(ADAP_EXEMPTION_WITH_CHILDREN)}/month</strong> with dependent children, and{" "}
                <strong>{fmtShort(ADAP_EXEMPTION_COHABITING)}/month</strong> for cohabiting partners who both receive disability assistance.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">AISH — permanently unable to work</p>
              <p className="text-sm leading-relaxed text-emerald-900">
                <strong>{fmt(AISH_LIVING_ALLOWANCE)}/month</strong> living allowance. For Albertans permanently unable to work.
                First <strong>{fmt(MONTHLY_EARNED_INCOME_EXEMPTION)}/month</strong> of employment income is fully exempt
                ({fmt(AISH_EMPLOYMENT_EXEMPTION.family.full)} for families). The
                government places you in ADAP or AISH based on your medical assessment — you apply
                once for both.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed text-amber-900">
              <strong>Rough estimate only.</strong> Both programs require a medical and financial
              review by Alberta Supports. This calculator uses 2026 base rates and simplified
              clawback rules. Always confirm your situation with Alberta Supports.{" "}
              <Link
                href="/articles/alberta-adap-application-2026-how-to-apply-what-it-pays-and-who-qualifies"
                className="underline font-semibold"
              >
                Read the full ADAP guide →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---- Main calculator ---- */}
      <div id="calculator" className="container mx-auto px-4 max-w-4xl py-10">

        {/* STEP 1: Inputs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-blue-600 px-6 py-4">
            <p className="text-white font-bold text-lg">Step 1 — Tell us about yourself</p>
            <p className="text-blue-100 text-sm mt-0.5">Fill in your details, then press Calculate to see the comparison.</p>
          </div>

          <div className="p-6 space-y-8">

            {/* Relationship status */}
            <div className="space-y-3">
              <label className="block text-base font-bold text-gray-800">
                Are you single, or do you have a partner?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "single",  label: "Single",               desc: "I live alone or without a partner" },
                  { value: "married", label: "Married / Common-law",  desc: "I have a spouse or common-law partner" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange(() => setMaritalStatus(opt.value))}
                    className={`text-left px-5 py-4 rounded-xl border-2 transition-all ${
                      maritalStatus === opt.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        maritalStatus === opt.value ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      }`}>
                        {maritalStatus === opt.value && <span className="w-2 h-2 rounded-full bg-white block" />}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {maritalStatus !== "single" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleChange(() => setPartnerOnDA(!partnerOnDA))}
                    aria-pressed={partnerOnDA}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                      partnerOnDA ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center mt-0.5 ${
                        partnerOnDA ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      }`}>
                        {partnerOnDA && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900">My partner also receives AISH or ADAP</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          From the August 2026 benefit period, each partner then receives{" "}
                          {Math.round(COUPLE_BOTH_ON_DISABILITY_RATE * 100)}% of the maximum individual living allowance,
                          and ADAP&apos;s exempt employment income rises to {fmt(ADAP_EXEMPTION_COHABITING)}/month.
                        </p>
                      </div>
                    </div>
                  </button>
                  <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    AISH uses higher income exemptions for families ({fmt(AISH_EMPLOYMENT_EXEMPTION.family.full)}/month fully exempt).
                    Both partners&apos; employment income counts toward the household total.
                  </p>
                </>
              )}
            </div>

            {/* Dependent children (AISH only) */}
            <div className="space-y-3">
              <label className="block text-base font-bold text-gray-800">
                How many dependent children do you have?
                <span className="block text-sm text-gray-500 font-normal mt-0.5">
                  Recalibrated for the August 2026 benefit period. AISH and ADAP now pay the same
                  monthly child benefit, per child: {CHILD_TIER_SUMMARY} ({fmt(CHILD_BENEFIT_TIERS[4])} for each child after the fourth).
                </span>
              </label>
              <div className="flex items-center gap-0 border-2 border-gray-200 rounded-xl overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => handleChange(() => setChildren(Math.max(0, children - 1)))}
                  className="w-14 h-14 bg-gray-50 hover:bg-gray-100 border-r-2 border-gray-200 text-gray-700 font-bold text-2xl flex items-center justify-center transition-colors"
                  aria-label="Decrease children"
                >−</button>
                <span className="w-16 text-center text-2xl font-bold text-gray-900">{children}</span>
                <button
                  type="button"
                  onClick={() => handleChange(() => setChildren(Math.min(8, children + 1)))}
                  className="w-14 h-14 bg-gray-50 hover:bg-gray-100 border-l-2 border-gray-200 text-gray-700 font-bold text-2xl flex items-center justify-center transition-colors"
                  aria-label="Increase children"
                >+</button>
              </div>
              {children > 0 && (
                <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2 w-fit">
                  Both programs add +{fmt(getChildBenefit(children))}/month for your {children} {children === 1 ? "child" : "children"}
                </p>
              )}
            </div>

            {/* My income */}
            <div className="space-y-3">
              <label htmlFor="income" className="block text-base font-bold text-gray-800">
                How much do <em>you</em> earn from work each month?
                <span className="block text-sm text-gray-500 font-normal mt-0.5">
                  Net (after-tax) employment income — your take-home pay after income tax, CPP, and EI. Enter 0 if you don&apos;t work.
                </span>
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                <input
                  id="income"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={rawIncome}
                  onChange={(e) => handleChange(() => setRawIncome(e.target.value.replace(/[^0-9.]/g, "")))}
                  className="w-full pl-8 pr-4 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Partner income */}
            {maritalStatus !== "single" && (
              <div className="space-y-3">
                <label htmlFor="partner-income" className="block text-base font-bold text-gray-800">
                  How much does your partner earn from work each month?
                  <span className="block text-sm text-gray-500 font-normal mt-0.5">
                    Net (after-tax) — their take-home pay after income tax, CPP, and EI. Enter 0 if they don&apos;t work.
                  </span>
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                  <input
                    id="partner-income"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={rawPartnerIncome}
                    onChange={(e) => handleChange(() => setRawPartnerIncome(e.target.value.replace(/[^0-9.]/g, "")))}
                    className="w-full pl-8 pr-4 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Calculate button */}
            <button
              type="button"
              onClick={() => setHasCalculated(true)}
              className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-10 py-4 text-base font-bold text-white transition-colors shadow-sm"
            >
              Compare ADAP vs AISH →
            </button>
          </div>
        </div>

        {/* STEP 2: Results */}
        {hasCalculated && (
          <div className="space-y-5" id="results">

            {/* Headline banner */}
            <div className={`rounded-2xl px-6 py-5 ${diffDir === "aish" ? "bg-emerald-600" : diffDir === "adap" ? "bg-blue-600" : "bg-gray-600"}`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-white shrink-0" />
                <div>
                  <p className="text-white font-bold text-xl leading-tight">
                    {diffDir === "aish"
                      ? `AISH pays an estimated ${fmtShort(Math.abs(result.monthlyDiff))} more per month than ADAP`
                      : diffDir === "adap"
                      ? `At this income level, ADAP pays an estimated ${fmtShort(Math.abs(result.monthlyDiff))} more per month`
                      : "At this income level, ADAP and AISH pay about the same"}
                  </p>
                  {diffDir === "aish" && (
                    <p className="text-emerald-100 text-sm mt-0.5">
                      That is {fmtShort(Math.abs(result.annualDiff))} more per year under AISH
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Three big numbers */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-gray-100 p-4 sm:p-6 gap-0">
                <div className="text-center px-3 py-4 sm:py-0 border-b sm:border-b-0 border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-2">ADAP pays</p>
                  <p className="text-3xl sm:text-3xl lg:text-4xl font-bold text-blue-700">{fmtShort(result.adapBenefit)}</p>
                  <p className="text-xs text-gray-400 mt-1">per month</p>
                </div>
                <div className="text-center px-3 py-4 sm:py-0 border-b sm:border-b-0 border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">AISH pays</p>
                  <p className="text-3xl sm:text-3xl lg:text-4xl font-bold text-emerald-700">{fmtShort(result.aishBenefit)}</p>
                  <p className="text-xs text-gray-400 mt-1">per month</p>
                </div>
                <div className="text-center px-3 py-4 sm:py-0">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${
                    diffDir === "aish" ? "text-emerald-600" : diffDir === "adap" ? "text-blue-600" : "text-gray-400"
                  }`}>Difference</p>
                  <p className={`text-3xl sm:text-3xl lg:text-4xl font-bold ${
                    diffDir === "aish" ? "text-emerald-700" : diffDir === "adap" ? "text-blue-700" : "text-gray-600"
                  }`}>
                    {diffDir === "aish" ? "+" : diffDir === "adap" ? "−" : ""}{fmtShort(Math.abs(result.monthlyDiff))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {diffDir === "aish" ? "AISH pays more" : diffDir === "adap" ? "ADAP pays more" : "same"}
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 label */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-gray-800 text-lg">Step 2 — How the numbers work</p>
            </div>

            {/* Side-by-side breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ADAP breakdown */}
              <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">ADAP — how it calculates</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-gray-500">
                      ADAP living allowance
                      {result.coupleRateApplied && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {Math.round(COUPLE_BOTH_ON_DISABILITY_RATE * 100)}% couples rate applied to {fmt(ADAP_LIVING_ALLOWANCE)}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-blue-700">{fmt(result.adapBase)}/mo</span>
                  </div>
                  {result.childBonus > 0 && (
                    <div className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-gray-500">Child benefit</span>
                      <span className="font-medium text-blue-600">+{fmt(result.childBonus)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-gray-500">Income exempt (first {fmtShort(result.adapExemption)})</span>
                    <span className="font-medium text-gray-700">{fmt(Math.min(result.household, result.adapExemption))}/mo</span>
                  </div>
                  {result.adapClawback > 0 && (
                    <div className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-gray-500">
                        Reduction on {fmtShort(result.adapExcess)} above exempt
                        <span className="block text-xs text-gray-400 mt-0.5">Modelled — see note below</span>
                      </span>
                      <span className="font-medium text-red-500">−{fmt(result.adapClawback)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-4 font-bold">
                    <span className="text-gray-900">ADAP benefit</span>
                    <span className="text-blue-700 text-lg">{fmt(result.adapBenefit)}/mo</span>
                  </div>
                </div>
              </div>

              {/* AISH breakdown */}
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">AISH — how it calculates</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-gray-500">
                      AISH living allowance
                      {result.coupleRateApplied && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {Math.round(COUPLE_BOTH_ON_DISABILITY_RATE * 100)}% couples rate applied to {fmt(AISH_LIVING_ALLOWANCE)}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-emerald-700">{fmt(result.aishBase)}/mo</span>
                  </div>
                  {result.childBonus > 0 && (
                    <div className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-gray-500">Child benefit</span>
                      <span className="font-medium text-emerald-600">+{fmt(result.childBonus)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-gray-500">
                      Income exempt (first {fmtShort(exemptionType === "family" ? AISH_EMPLOYMENT_EXEMPTION.family.full : MONTHLY_EARNED_INCOME_EXEMPTION)})
                    </span>
                    <span className="font-medium text-gray-700">{fmt(result.aishExemption)}/mo</span>
                  </div>
                  {result.aishClawback > 0 && (
                    <div className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-gray-500">Clawback on income above exempt</span>
                      <span className="font-medium text-red-500">−{fmt(result.aishClawback)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-4 font-bold">
                    <span className="text-gray-900">AISH benefit</span>
                    <span className="text-emerald-700 text-lg">{fmt(result.aishBenefit)}/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Difference summary */}
            <div className={`rounded-2xl p-5 border ${diffDir === "aish" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="font-bold text-gray-900 mb-3">Why the difference changes with income</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                At <strong>$0 employment income</strong> the gap is the difference in living allowances —{" "}
                <strong>{fmtShort(AISH_BASE_SINGLE - ADAP_BASE_SINGLE)}/month</strong> ({fmtShort(AISH_BASE_SINGLE)} − {fmtShort(ADAP_BASE_SINGLE)}).
                The two programs then reduce very differently. AISH exempts your first{" "}
                <strong>{fmt(result.aishExemption > 0 ? (exemptionType === "family" ? AISH_EMPLOYMENT_EXEMPTION.family.full : MONTHLY_EARNED_INCOME_EXEMPTION) : MONTHLY_EARNED_INCOME_EXEMPTION)}/month</strong>,
                half-exempts the next slice, then deducts the rest dollar-for-dollar — so AISH falls away sharply.
                ADAP exempts <strong>{fmtShort(result.adapExemption)}/month</strong> and then reduces gradually,
                letting you earn up to <strong>{fmtShort(ADAP_BENEFIT_END_ANNUAL_INCOME)}/year</strong> before the
                financial benefit runs out. That is why ADAP can be worth more than AISH once your earnings climb.
              </p>
            </div>

            {/* Fully clawed back warnings */}
            {result.adapFullyClawedBack && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>ADAP income limit reached:</strong> At {fmt(result.household)}/month household income,
                  ADAP&apos;s clawback fully offsets the benefit. You would receive no ADAP payment at this income level.
                </p>
              </div>
            )}
            {result.aishFullyClawedBack && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>AISH income limit reached:</strong> At {fmt(result.household)}/month household income,
                  AISH&apos;s clawback fully offsets the benefit.
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Rough estimate only</p>
                <p>
                  ADAP and AISH eligibility both require a medical assessment and a full income and asset review
                  by Alberta Supports.
                </p>
                <p className="mt-2">
                  <strong>About the ADAP reduction:</strong> the living allowances, exemption thresholds, child
                  benefit rates and the {Math.round(COUPLE_BOTH_ON_DISABILITY_RATE * 100)}% couples rate above are
                  published by the Alberta government. The exact rate at which ADAP reduces your benefit above the
                  exemption is set by Ministerial order and has <em>not</em> been published. Alberta has said only
                  that the reduction begins at less than a cent per dollar and increases as earnings approach{" "}
                  {fmtShort(ADAP_BENEFIT_END_ANNUAL_INCOME)}/year, where the financial benefit ends. This calculator
                  models a gradual curve between those two published points, so ADAP figures at mid-range incomes are
                  an approximation. Always confirm with Alberta Supports or a qualified advisor.
                </p>
              </div>
            </div>

            {/* Re-calculate nudge */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-gray-500">Changed a number above? Press Calculate again to update.</p>
              <button
                type="button"
                onClick={() => { setHasCalculated(false); document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" }) }}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                ← Start over
              </button>
            </div>

            {/* Related reading */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-bold text-gray-900">Related Reading</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/articles/alberta-adap-application-2026-how-to-apply-what-it-pays-and-who-qualifies"
                  className="group bg-white rounded-2xl border border-blue-100 hover:border-blue-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  <div className="relative w-full aspect-video overflow-hidden bg-gray-100 shrink-0">
                    <Image
                      src="https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1779172830621-oe9thn.jpg"
                      alt="Alberta ADAP Application 2026: How to Apply, What It Pays, and Who Qualifies"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 480px"
                    />
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug text-sm mb-1.5">
                        Alberta ADAP Application 2026: How to Apply, What It Pays, and Who Qualifies
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Who qualifies, what ADAP and AISH each pay, the July 2026 launch, and how to apply.
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
                <Link
                  href="/articles/aish-payments-in-alberta-2026-how-much-you-get-when-it-arrives-and-whats-changing-in-july"
                  className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  <div className="relative w-full aspect-video overflow-hidden bg-gray-100 shrink-0">
                    <Image
                      src="https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1776632299965-2pipcg.jpg"
                      alt="AISH Payments in Alberta 2026"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 480px"
                    />
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug text-sm mb-1.5">
                        AISH Payments in Alberta 2026: How Much You Get, When It Arrives
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        The 2026 AISH payment amount, deposit timing, and the July disability support changes Albertans should know.
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
                <Link
                  href="/tools/aish-calculator"
                  className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all p-4 flex items-center justify-between gap-4 sm:col-span-2"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Tool</p>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm leading-snug">AISH Calculator Alberta 2026</p>
                    <p className="text-xs text-gray-500 mt-0.5">Full AISH breakdown with clawback, child benefit, and 2026 payment dates.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* Prompt to calculate if not yet done */}
        {!hasCalculated && (
          <div className="text-center py-6 text-gray-400 text-sm">
            Fill in your details above, then press <strong className="text-blue-600">Compare ADAP vs AISH</strong> to see the comparison.
          </div>
        )}

      </div>
    </div>
  )
}
