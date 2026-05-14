"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import { ArrowLeft, ArrowRight, Info, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react"

// ---------------------------------------------------------------------------
// 2026 AISH program constants (Alberta government — verify annually)
// ---------------------------------------------------------------------------
const AISH_BASE_SINGLE = 1685
const AISH_DEPENDENT_CHILD = 196
const MONTHLY_EARNED_INCOME_EXEMPTION = 1072
const CLAWBACK_RATE = 0.5

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

function calculateAISH(inputs: {
  dependentChildren: number
  monthlyEmploymentIncome: number
}) {
  const { dependentChildren, monthlyEmploymentIncome } = inputs

  const baseMonthly = AISH_BASE_SINGLE
  const childSupplement = dependentChildren * AISH_DEPENDENT_CHILD
  const grossMonthly = baseMonthly + childSupplement

  const taxableIncome = Math.max(0, monthlyEmploymentIncome - MONTHLY_EARNED_INCOME_EXEMPTION)
  const clawback = taxableIncome * CLAWBACK_RATE
  const netMonthly = Math.max(0, grossMonthly - clawback)
  const annualBenefit = netMonthly * 12

  // Estimated income tax on employment income only (AISH is tax-free)
  const annualEmployment = monthlyEmploymentIncome * 12
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
    exemptionApplied: Math.min(monthlyEmploymentIncome, MONTHLY_EARNED_INCOME_EXEMPTION),
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

  const monthlyEmploymentIncome = Math.max(0, parseFloat(rawIncome) || 0)

  const result = useMemo(
    () => calculateAISH({ dependentChildren, monthlyEmploymentIncome }),
    [dependentChildren, monthlyEmploymentIncome]
  )

  const keepPct = result.grossMonthly > 0
    ? Math.round((result.netMonthly / result.grossMonthly) * 100)
    : 100
  const clawPct = 100 - keepPct

  // Plain-language context
  const context = useMemo(() => {
    if (result.fullyClawedBack)
      return { type: "warn" as const, text: `At ${fmt(monthlyEmploymentIncome)}/month employment income, your AISH is fully offset. You keep your wages but receive no AISH.` }
    if (monthlyEmploymentIncome === 0)
      return { type: "good" as const, text: `With no employment income, you receive the full ${fmt(result.grossMonthly)}/month.` }
    if (monthlyEmploymentIncome <= MONTHLY_EARNED_INCOME_EXEMPTION)
      return { type: "good" as const, text: `Your entire ${fmt(monthlyEmploymentIncome)} income is within the exempt range — it doesn't reduce your AISH at all.` }
    return { type: "neutral" as const, text: `You earn ${fmt(monthlyEmploymentIncome - MONTHLY_EARNED_INCOME_EXEMPTION)} above the exempt threshold. Half of that — ${fmt(result.clawback)} — is deducted from your monthly AISH.` }
  }, [result, monthlyEmploymentIncome])

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
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="inline-block text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full mb-3">
                Free Calculator · 2026 Rates
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                AISH Payment Calculator
              </h1>
              <p className="text-gray-500 text-base max-w-xl leading-relaxed">
                See exactly what you&apos;ll receive — monthly and annually — after the income clawback and estimated taxes.
              </p>
            </div>

            {/* Key rate pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { label: "Base benefit", value: `${fmtShort(AISH_BASE_SINGLE)}/mo` },
                { label: "Income exempt", value: `${fmtShort(MONTHLY_EARNED_INCOME_EXEMPTION)}/mo` },
                { label: "Clawback rate", value: "50¢ per $1" },
              ].map((pill) => (
                <div key={pill.label} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-center min-w-[110px]">
                  <p className="text-base font-bold text-gray-900">{pill.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pill.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

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
                      onClick={() => setMaritalStatus(opt.value)}
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
                    A spouse&apos;s income can also reduce your benefit. Contact Alberta Supports for a full assessment.
                  </p>
                )}
                {maritalStatus === "married-both" && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2 mt-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Each partner receives their own AISH. Enter your individual income below.
                  </p>
                )}
              </div>

              {/* Dependent children */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Dependent children
                  <span className="ml-1.5 text-gray-400 font-normal text-xs">(+{fmt(AISH_DEPENDENT_CHILD)}/child/mo)</span>
                </label>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => setDependentChildren(Math.max(0, dependentChildren - 1))}
                    className="w-12 h-12 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-700 font-semibold text-xl flex items-center justify-center transition-colors"
                    aria-label="Decrease"
                  >−</button>
                  <span className="w-14 text-center text-lg font-bold text-gray-900">{dependentChildren}</span>
                  <button
                    type="button"
                    onClick={() => setDependentChildren(Math.min(8, dependentChildren + 1))}
                    className="w-12 h-12 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-700 font-semibold text-xl flex items-center justify-center transition-colors"
                    aria-label="Increase"
                  >+</button>
                </div>
                {dependentChildren > 0 && (
                  <p className="text-xs text-emerald-700">+{fmt(AISH_DEPENDENT_CHILD * dependentChildren)}/month added</p>
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
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={rawIncome}
                    onChange={(e) => setRawIncome(e.target.value)}
                    className="w-full pl-8 pr-4 py-3.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400">First {fmt(MONTHLY_EARNED_INCOME_EXEMPTION)}/month is exempt from clawback</p>
              </div>
            </div>

            {/* How it works — collapsible */}
            <details className="bg-white rounded-xl border border-gray-200 group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-gray-900">How the calculation works</span>
                <span className="text-gray-400 text-lg leading-none group-open:rotate-45 transition-transform inline-block">+</span>
              </summary>
              <div className="px-5 pb-5 pt-3 space-y-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                <p><strong className="text-gray-800">Base benefit:</strong> Every AISH recipient gets {fmt(AISH_BASE_SINGLE)}/month (2026 rate). This does not change based on marital status alone.</p>
                <p><strong className="text-gray-800">Child supplement:</strong> {fmt(AISH_DEPENDENT_CHILD)}/month is added per dependent child in your home.</p>
                <p><strong className="text-gray-800">Exemption (MEIE):</strong> The first {fmt(MONTHLY_EARNED_INCOME_EXEMPTION)} you earn monthly is ignored — you keep it on top of AISH with no penalty.</p>
                <p><strong className="text-gray-800">Clawback:</strong> For every $1 above the exemption, 50¢ is deducted from your AISH. You always come out ahead by working.</p>
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
                    <span className="text-gray-500">Child supplement ({dependentChildren} × {fmt(AISH_DEPENDENT_CHILD)})</span>
                    <span className="font-medium text-emerald-700">+{fmt(result.childSupplement)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="font-medium text-gray-700">Gross AISH benefit</span>
                  <span className="font-semibold text-gray-900">{fmt(result.grossMonthly)}/mo</span>
                </div>
                {monthlyEmploymentIncome > 0 && (
                  <>
                    <div className="flex justify-between py-2.5 text-sm text-gray-400">
                      <span>Employment income earned</span>
                      <span>{fmt(monthlyEmploymentIncome)}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm text-gray-400">
                      <span>Exempt (MEIE — first {fmt(MONTHLY_EARNED_INCOME_EXEMPTION)})</span>
                      <span>−{fmt(result.exemptionApplied)}</span>
                    </div>
                    {result.clawback > 0 && (
                      <div className="flex justify-between py-2.5 text-sm">
                        <span className="text-gray-500">Clawback (50% × {fmt(Math.max(0, monthlyEmploymentIncome - MONTHLY_EARNED_INCOME_EXEMPTION))} above exemption)</span>
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
            {monthlyEmploymentIncome > 0 && (
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
                    <span className="text-gray-500">Employment income (gross)</span>
                    <span className="text-gray-700">{fmt(monthlyEmploymentIncome)}</span>
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
                      <p className="text-xs text-gray-400 mt-0.5">AISH + after-tax employment income</p>
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
                At {fmt(MONTHLY_EARNED_INCOME_EXEMPTION + result.grossMonthly / CLAWBACK_RATE)}/month employment income, your AISH reaches zero. Below that, every hour worked adds money to your overall income.
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>Disclaimer:</strong> Estimates only. Actual benefits and taxes depend on your full financial situation, filing status, and deductions not covered here. Always confirm with{" "}
                <a href="https://www.alberta.ca/aish" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">
                  Alberta.ca/AISH
                </a>{" "}
                and a tax professional.
              </p>
            </div>

            {/* Related article */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Related Reading</p>
              <Link
                href="/articles/aish-vs-cpp-disability-in-alberta-which-program-should-you-apply-for"
                className="group flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:underline leading-snug">
                    AISH vs CPP Disability in Alberta: Which Program Should You Apply For?
                  </h3>
                  <p className="text-xs text-gray-500">
                    A plain-language comparison of eligibility, payment amounts, and what happens if you qualify for both.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Official resources */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Official Government Resources</p>
                <p className="text-xs text-gray-400">Opens Alberta.ca in a new tab — you stay on this page.</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { href: "https://www.alberta.ca/aish-eligibility", label: "AISH Eligibility", desc: "Find out if you qualify based on medical, financial, and residency criteria." },
                  { href: "https://www.alberta.ca/aish-what-you-get", label: "What You Get", desc: "Full breakdown of the living allowance, health benefits, and personal benefits." },
                  { href: "https://www.alberta.ca/aish-how-to-apply", label: "How to Apply for AISH", desc: "Step-by-step guide: online application, medical report, required documents." },
                  { href: "https://www.alberta.ca/aish-payment-details", label: "Payment Details & Dates", desc: "When payments are issued and how direct deposit works." },
                  { href: "https://www.alberta.ca/aish-report-a-change", label: "Report a Change", desc: "Required to report changes in income, living situation, or medical status." },
                  { href: "https://www.alberta.ca/aish-contact", label: "Contact AISH", desc: "Phone numbers, office locations, and fax for the AISH program." },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-900 group-hover:underline">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-300 pt-2 border-t border-gray-50">
                Source:{" "}
                <a href="https://www.alberta.ca/aish" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">
                  alberta.ca/aish
                </a>{" "}
                — Government of Alberta
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
