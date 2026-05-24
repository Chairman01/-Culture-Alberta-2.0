"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import { ArrowLeft, ChevronRight, Info } from "lucide-react"
import { Article } from "@/lib/types/article"
import { getArticleUrl } from "@/lib/utils/article-url"

// ---------------------------------------------------------------------------
// Cost of living data — Calgary vs Edmonton (2025 estimates)
// Sources: CMHC, Statistics Canada, Numbeo, City of Calgary, City of Edmonton
// Values are approximate monthly averages for a single adult or couple
// ---------------------------------------------------------------------------

interface CostCategory {
  id: string
  label: string
  description: string
  calgary: number
  edmonton: number
  unit: string
  note?: string
}

const COST_DATA: CostCategory[] = [
  // Housing
  {
    id: "rent-1br",
    label: "Rent — 1-Bedroom Apartment",
    description: "Average monthly rent for a 1-bedroom in the city",
    calgary: 1920,
    edmonton: 1440,
    unit: "/month",
    note: "CMHC 2024 average asking rents",
  },
  {
    id: "rent-2br",
    label: "Rent — 2-Bedroom Apartment",
    description: "Average monthly rent for a 2-bedroom in the city",
    calgary: 2350,
    edmonton: 1790,
    unit: "/month",
    note: "CMHC 2024 average asking rents",
  },
  {
    id: "transit",
    label: "Monthly Transit Pass",
    description: "Adult monthly transit pass",
    calgary: 115,
    edmonton: 100,
    unit: "/month",
    note: "2025 rates",
  },
  {
    id: "gas",
    label: "Gas (per litre)",
    description: "Average regular gasoline price",
    calgary: 1.42,
    edmonton: 1.38,
    unit: "/litre",
    note: "2025 average; Edmonton typically slightly cheaper (no carbon levy top-up)",
  },
  {
    id: "utilities",
    label: "Utilities (heat, electricity, water)",
    description: "Combined monthly average for a 1-bedroom unit",
    calgary: 160,
    edmonton: 145,
    unit: "/month",
  },
  {
    id: "groceries",
    label: "Groceries",
    description: "Estimated monthly grocery spend for one adult",
    calgary: 520,
    edmonton: 500,
    unit: "/month",
    note: "Both cities are broadly similar; prices vary by neighbourhood",
  },
  {
    id: "restaurant-mid",
    label: "Restaurant Meal (mid-range)",
    description: "Two people, mid-range restaurant",
    calgary: 80,
    edmonton: 70,
    unit: "per meal",
    note: "Calgary has a larger fine-dining market which pushes averages up",
  },
  {
    id: "coffee",
    label: "Coffee (latte)",
    description: "Regular latte at a café",
    calgary: 6.5,
    edmonton: 6.0,
    unit: "each",
  },
  {
    id: "gym",
    label: "Gym Membership",
    description: "Standard fitness centre monthly membership",
    calgary: 55,
    edmonton: 45,
    unit: "/month",
  },
  {
    id: "property-tax",
    label: "Property Tax (avg. home)",
    description: "Annual property tax on an average-priced home",
    calgary: 4200,
    edmonton: 4800,
    unit: "/year",
    note: "Edmonton's mill rate is higher; Calgary's higher home values even the total burden",
  },
  {
    id: "home-price",
    label: "Average Home Price",
    description: "Benchmark composite home price",
    calgary: 610000,
    edmonton: 430000,
    unit: "",
    note: "CREA MLS HPI, early 2025",
  },
  {
    id: "childcare",
    label: "$10/day Childcare (after subsidy)",
    description: "Parent fee under the Canada-Alberta early learning agreement",
    calgary: 10,
    edmonton: 10,
    unit: "/day",
    note: "Both cities now have $10/day regulated childcare spaces (limited availability)",
  },
  {
    id: "internet",
    label: "Home Internet (100 Mbps+)",
    description: "Monthly home internet plan",
    calgary: 85,
    edmonton: 80,
    unit: "/month",
  },
  {
    id: "parking",
    label: "Downtown Parking (monthly)",
    description: "Monthly reserved parking in the downtown core",
    calgary: 310,
    edmonton: 180,
    unit: "/month",
    note: "Calgary downtown parking is significantly more expensive",
  },
]

type City = "calgary" | "edmonton"

function formatValue(value: number, id: string, unit: string): string {
  if (id === "gas") return `$${value.toFixed(2)}${unit}`
  if (id === "coffee") return `$${value.toFixed(2)}${unit}`
  if (value >= 1000) {
    return `$${value.toLocaleString("en-CA")}${unit}`
  }
  return `$${value.toFixed(0)}${unit}`
}

function getDiffLabel(calgary: number, edmonton: number): { label: string; color: string; winner: City | "tie" } {
  const diff = Math.abs(calgary - edmonton)
  const pct = (diff / Math.max(calgary, edmonton)) * 100

  if (diff === 0) return { label: "Same", color: "text-gray-500", winner: "tie" }

  const cheaper: City = calgary < edmonton ? "calgary" : "edmonton"
  const pctStr = pct < 1 ? "<1%" : `${pct.toFixed(0)}%`

  return {
    label: `${cheaper === "calgary" ? "Calgary" : "Edmonton"} cheaper by ${pctStr}`,
    color: cheaper === "calgary" ? "text-blue-600" : "text-green-600",
    winner: cheaper,
  }
}

interface Props {
  relatedArticles?: Article[]
}

export default function CostOfLivingClient({ relatedArticles = [] }: Props) {
  const [income, setIncome] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const categories = [
    { id: "all", label: "All" },
    { id: "housing", label: "Housing" },
    { id: "transport", label: "Transport" },
    { id: "food", label: "Food" },
    { id: "lifestyle", label: "Lifestyle" },
  ]

  const categoryMap: Record<string, string[]> = {
    housing: ["rent-1br", "rent-2br", "utilities", "property-tax", "home-price", "childcare"],
    transport: ["transit", "gas", "parking"],
    food: ["groceries", "restaurant-mid", "coffee"],
    lifestyle: ["gym", "internet"],
  }

  const filteredData = activeCategory === "all"
    ? COST_DATA
    : COST_DATA.filter(item => categoryMap[activeCategory]?.includes(item.id))

  const monthlySummary = useMemo(() => {
    const monthlyItems = COST_DATA.filter(d =>
      ["rent-1br", "transit", "utilities", "groceries", "gym", "internet"].includes(d.id)
    )
    const calTotal = monthlyItems.reduce((sum, d) => sum + d.calgary, 0)
    const edmTotal = monthlyItems.reduce((sum, d) => sum + d.edmonton, 0)
    return { calgary: calTotal, edmonton: edmTotal }
  }, [])

  const incomeNum = parseFloat(income.replace(/,/g, "")) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            All Alberta Tools
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">2025 data</span>
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Free</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Calgary vs Edmonton: Cost of Living
          </h1>
          <p className="text-gray-600 text-lg">
            Compare housing, food, transport, and lifestyle costs across Alberta&apos;s two largest cities.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xl text-gray-900">🏙️ Calgary</span>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Higher cost</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">${monthlySummary.calgary.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">estimated monthly baseline*</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-green-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xl text-gray-900">🏙️ Edmonton</span>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Lower cost</span>
            </div>
            <p className="text-3xl font-bold text-green-700">${monthlySummary.edmonton.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">estimated monthly baseline*</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">* Baseline = rent (1BR) + transit + utilities + groceries + gym + internet. Actual costs will vary.</p>

        {/* Income take-home section (optional) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            See What You&apos;d Have Left Over
          </h2>
          <p className="text-sm text-gray-500 mb-4">Enter your monthly take-home (after-tax) income to see how much you&apos;d have left in each city after baseline expenses.</p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Take-Home Income</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  className="border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  placeholder="e.g. 4500"
                  value={income}
                  onChange={e => setIncome(e.target.value)}
                />
              </div>
            </div>
          </div>
          {incomeNum > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Calgary — left over</p>
                <p className={`text-2xl font-bold ${incomeNum - monthlySummary.calgary >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  ${(incomeNum - monthlySummary.calgary).toLocaleString("en-CA")}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Edmonton — left over</p>
                <p className={`text-2xl font-bold ${incomeNum - monthlySummary.edmonton >= 0 ? "text-green-700" : "text-red-600"}`}>
                  ${(incomeNum - monthlySummary.edmonton).toLocaleString("en-CA")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-2 px-5 py-3">Category</div>
            <div className="px-3 py-3 text-center text-blue-700">Calgary</div>
            <div className="px-3 py-3 text-center text-green-700">Edmonton</div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredData.map(item => {
              const diff = getDiffLabel(item.calgary, item.edmonton)
              return (
                <div key={item.id} className="grid grid-cols-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    {item.note && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.note}</p>
                    )}
                    <span className={`text-xs font-medium ${diff.color} mt-1 block`}>{diff.label}</span>
                  </div>
                  <div className={`px-3 py-4 text-center font-semibold text-sm ${diff.winner === "calgary" ? "text-blue-700 bg-blue-50" : diff.winner === "tie" ? "text-gray-600" : "text-gray-700"}`}>
                    {formatValue(item.calgary, item.id, item.unit)}
                  </div>
                  <div className={`px-3 py-4 text-center font-semibold text-sm ${diff.winner === "edmonton" ? "text-green-700 bg-green-50" : diff.winner === "tie" ? "text-gray-600" : "text-gray-700"}`}>
                    {formatValue(item.edmonton, item.id, item.unit)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary / verdict */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">The Bottom Line</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p className="font-semibold text-blue-700">Calgary tends to cost more for:</p>
              <ul className="space-y-1 text-gray-600">
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />Rent (20–30% higher on average)</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />Buying a home (benchmark ~$180K higher)</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />Downtown parking</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />Dining out</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-green-700">Edmonton tends to cost more for:</p>
              <ul className="space-y-1 text-gray-600">
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />Property taxes (higher mill rate)</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />Some utility costs</li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">Salaries in Calgary (especially oil & gas, finance, tech) are typically higher, which may offset the higher cost of living for many workers.</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Data Notes</p>
          <p>Figures are approximate 2025 estimates compiled from CMHC, Statistics Canada, CREA, and local sources. Costs vary significantly by neighbourhood, lifestyle, and family size. This tool is for general comparison and should not be used for financial planning decisions.</p>
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

        {/* More Tools */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">More Alberta Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/tools/alberta-rental-increase-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <span className="text-xl">🏠</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Rental Increase Check</p>
                <p className="text-xs text-gray-500">Is your rent increase legal?</p>
              </div>
            </Link>
            <Link href="/tools/aish-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">AISH Calculator</p>
                <p className="text-xs text-gray-500">Assured income amounts</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
