"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ArrowRight, Info, Search, MapPin, TrendingUp, TrendingDown, Home, Building2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

// ---------------------------------------------------------------------------
// 2024 Alberta Municipality Mill Rate Data
// Source: Municipal budget documents & Alberta Municipal Affairs
// Note: Rates are approximate 2024 residential mill rates (per $1,000 assessed value).
// Always verify with your municipality before making financial decisions.
// ---------------------------------------------------------------------------

interface Municipality {
  name: string
  region: "Calgary Region" | "Edmonton Region" | "Central Alberta" | "Southern Alberta" | "Northern Alberta" | "Mountain/Foothills"
  municipalRate: number
  educationRate: number
  population: number
  avgHomePrice: number
  notes?: string
}

const MUNICIPALITIES: Municipality[] = [
  // Calgary Region
  { name: "Calgary", region: "Calgary Region", municipalRate: 6.72, educationRate: 2.55, population: 1336000, avgHomePrice: 590000 },
  { name: "Airdrie", region: "Calgary Region", municipalRate: 5.54, educationRate: 2.55, population: 79000, avgHomePrice: 490000 },
  { name: "Chestermere", region: "Calgary Region", municipalRate: 5.89, educationRate: 2.55, population: 26000, avgHomePrice: 530000 },
  { name: "Cochrane", region: "Calgary Region", municipalRate: 6.12, educationRate: 2.55, population: 30000, avgHomePrice: 500000 },
  { name: "Okotoks", region: "Calgary Region", municipalRate: 7.23, educationRate: 2.55, population: 31000, avgHomePrice: 475000 },
  { name: "High River", region: "Calgary Region", municipalRate: 8.34, educationRate: 2.55, population: 14500, avgHomePrice: 380000 },

  // Edmonton Region
  { name: "Edmonton", region: "Edmonton Region", municipalRate: 8.67, educationRate: 2.56, population: 1010000, avgHomePrice: 430000 },
  { name: "St. Albert", region: "Edmonton Region", municipalRate: 8.87, educationRate: 2.56, population: 69000, avgHomePrice: 470000 },
  { name: "Spruce Grove", region: "Edmonton Region", municipalRate: 7.34, educationRate: 2.56, population: 43000, avgHomePrice: 400000 },
  { name: "Leduc", region: "Edmonton Region", municipalRate: 7.56, educationRate: 2.56, population: 35000, avgHomePrice: 380000 },
  { name: "Fort Saskatchewan", region: "Edmonton Region", municipalRate: 7.12, educationRate: 2.56, population: 27000, avgHomePrice: 390000 },
  { name: "Beaumont", region: "Edmonton Region", municipalRate: 6.78, educationRate: 2.56, population: 22000, avgHomePrice: 420000 },
  { name: "Devon", region: "Edmonton Region", municipalRate: 7.45, educationRate: 2.56, population: 7000, avgHomePrice: 345000 },
  { name: "Stony Plain", region: "Edmonton Region", municipalRate: 7.89, educationRate: 2.56, population: 17000, avgHomePrice: 365000 },
  { name: "Sherwood Park", region: "Edmonton Region", municipalRate: 6.78, educationRate: 2.56, population: 84000, avgHomePrice: 460000, notes: "Strathcona County" },

  // Central Alberta
  { name: "Red Deer", region: "Central Alberta", municipalRate: 9.89, educationRate: 2.56, population: 103000, avgHomePrice: 360000 },
  { name: "Lacombe", region: "Central Alberta", municipalRate: 9.23, educationRate: 2.56, population: 14000, avgHomePrice: 295000 },
  { name: "Sylvan Lake", region: "Central Alberta", municipalRate: 8.67, educationRate: 2.56, population: 15500, avgHomePrice: 310000 },
  { name: "Innisfail", region: "Central Alberta", municipalRate: 9.78, educationRate: 2.56, population: 8000, avgHomePrice: 275000 },
  { name: "Olds", region: "Central Alberta", municipalRate: 9.45, educationRate: 2.56, population: 9000, avgHomePrice: 280000 },
  { name: "Wetaskiwin", region: "Central Alberta", municipalRate: 10.23, educationRate: 2.56, population: 12000, avgHomePrice: 260000 },
  { name: "Camrose", region: "Central Alberta", municipalRate: 9.12, educationRate: 2.56, population: 19500, avgHomePrice: 295000 },

  // Southern Alberta
  { name: "Lethbridge", region: "Southern Alberta", municipalRate: 8.77, educationRate: 2.56, population: 101000, avgHomePrice: 340000 },
  { name: "Medicine Hat", region: "Southern Alberta", municipalRate: 7.12, educationRate: 2.56, population: 65000, avgHomePrice: 310000 },
  { name: "Brooks", region: "Southern Alberta", municipalRate: 8.56, educationRate: 2.56, population: 14500, avgHomePrice: 270000 },

  // Northern Alberta
  { name: "Grande Prairie", region: "Northern Alberta", municipalRate: 9.45, educationRate: 2.56, population: 68000, avgHomePrice: 355000 },
  { name: "Fort McMurray", region: "Northern Alberta", municipalRate: 9.23, educationRate: 2.56, population: 70000, avgHomePrice: 400000, notes: "Wood Buffalo" },
  { name: "Cold Lake", region: "Northern Alberta", municipalRate: 8.34, educationRate: 2.56, population: 15000, avgHomePrice: 310000 },
  { name: "Lloydminster", region: "Northern Alberta", municipalRate: 8.12, educationRate: 2.56, population: 31000, avgHomePrice: 295000, notes: "AB portion" },
  { name: "Slave Lake", region: "Northern Alberta", municipalRate: 11.12, educationRate: 2.56, population: 7000, avgHomePrice: 240000 },
  { name: "Peace River", region: "Northern Alberta", municipalRate: 11.45, educationRate: 2.56, population: 6700, avgHomePrice: 230000 },
  { name: "Whitecourt", region: "Northern Alberta", municipalRate: 10.12, educationRate: 2.56, population: 9500, avgHomePrice: 245000 },
  { name: "Edson", region: "Northern Alberta", municipalRate: 10.56, educationRate: 2.56, population: 8800, avgHomePrice: 240000 },
  { name: "Hinton", region: "Northern Alberta", municipalRate: 11.23, educationRate: 2.56, population: 9800, avgHomePrice: 255000 },
  { name: "High Level", region: "Northern Alberta", municipalRate: 12.34, educationRate: 2.56, population: 3700, avgHomePrice: 215000 },

  // Mountain/Foothills
  { name: "Canmore", region: "Mountain/Foothills", municipalRate: 4.34, educationRate: 2.55, population: 15000, avgHomePrice: 920000, notes: "Luxury market" },
  { name: "Banff", region: "Mountain/Foothills", municipalRate: 5.67, educationRate: 2.55, population: 8000, avgHomePrice: 850000, notes: "National Park" },
]

const REGION_COLORS: Record<Municipality["region"], string> = {
  "Calgary Region": "bg-red-100 text-red-700 border-red-200",
  "Edmonton Region": "bg-blue-100 text-blue-700 border-blue-200",
  "Central Alberta": "bg-amber-100 text-amber-700 border-amber-200",
  "Southern Alberta": "bg-green-100 text-green-700 border-green-200",
  "Northern Alberta": "bg-purple-100 text-purple-700 border-purple-200",
  "Mountain/Foothills": "bg-teal-100 text-teal-700 border-teal-200",
}

const REGION_DOT: Record<Municipality["region"], string> = {
  "Calgary Region": "bg-red-500",
  "Edmonton Region": "bg-blue-500",
  "Central Alberta": "bg-amber-500",
  "Southern Alberta": "bg-green-500",
  "Northern Alberta": "bg-purple-500",
  "Mountain/Foothills": "bg-teal-500",
}

function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
}
function fmtRate(n: number) {
  return n.toFixed(4)
}

const FAQ = [
  {
    q: "What is a mill rate in Alberta?",
    a: "A mill rate is the amount of tax payable per $1,000 of assessed property value. If your home is assessed at $400,000 and the total mill rate is 10.00, your annual property tax would be $4,000. The word 'mill' comes from the Latin 'mille' meaning one thousand.",
  },
  {
    q: "How does the province set the education portion of my property tax?",
    a: "The Government of Alberta sets a provincial education requisition each year. Municipalities collect this on behalf of the province and remit it to fund K-12 education. The residential education rate for 2024 was approximately $2.56 per $1,000 of assessed value, but varies slightly by municipality based on equalized assessment ratios.",
  },
  {
    q: "What is market value assessment in Alberta?",
    a: "Alberta uses a market value standard for property assessment. The Municipal Government Act requires assessors to estimate what your property would sell for on the open market as of July 1 of the prior year, using sales data and mass appraisal models. Your assessed value may differ from your actual purchase price.",
  },
  {
    q: "Why is Calgary's mill rate so much lower than Edmonton's?",
    a: "Calgary's lower mill rate largely reflects its stronger commercial and industrial tax base. Calgary has more commercial properties — particularly downtown office towers and retail — that spread the tax burden. Edmonton has a higher residential mill rate to compensate for a lower commercial property ratio and higher per-capita service costs.",
  },
  {
    q: "Can I dispute my property assessment in Alberta?",
    a: "Yes. You have the right to file a formal complaint with your municipality's Assessment Review Board (ARB) if you believe your assessment is too high. The deadline is typically in March or April. You can request an informal review before filing formally. Prepare comparable sales data from the July 1 prior year to support your case.",
  },
  {
    q: "Why are small northern Alberta towns taxed at much higher rates?",
    a: "Smaller and more remote municipalities have fewer properties to tax, yet still must fund roads, utilities, emergency services, and administration. With a smaller assessment base, each property must carry a larger share of total costs, resulting in higher mill rates. Fort McMurray-area properties often also carry regional service levy add-ons.",
  },
  {
    q: "Does the property tax calculator account for local improvement levies?",
    a: "No. This calculator shows the base municipal + education mill rates. Many municipalities add local improvement charges (LICs) for specific projects like new roads, water mains, or sidewalks in front of your property. Check your tax notice or contact your municipality for any applicable local levies.",
  },
  {
    q: "When is property tax due in Alberta?",
    a: "Most Alberta municipalities have a property tax deadline around late June or early July, though exact dates vary. Calgary and Edmonton both use a June 30 deadline. Many municipalities offer monthly tax payment plans (TIPP) to spread payments across the year. Late payments typically incur a 1.25%–2% monthly penalty.",
  },
]

export default function AlbertaPropertyTaxCalculatorClient() {
  const [selectedMuni, setSelectedMuni] = useState<Municipality>(
    MUNICIPALITIES.find(m => m.name === "Calgary")!
  )
  const [assessedValue, setAssessedValue] = useState(500000)
  const [inputValue, setInputValue] = useState("500,000")
  const [propertyType, setPropertyType] = useState<"residential" | "nonResidential">("residential")
  const [search, setSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [sortField, setSortField] = useState<"name" | "total" | "municipal" | "avgHomePrice">("total")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showAllMunis, setShowAllMunis] = useState(false)

  const NON_RES_MULTIPLIER = 2.8 // non-residential rates are ~2.8x residential in most AB munis

  const muniRate = propertyType === "residential" ? selectedMuni.municipalRate : selectedMuni.municipalRate * NON_RES_MULTIPLIER
  const eduRate = propertyType === "residential" ? selectedMuni.educationRate : selectedMuni.educationRate * NON_RES_MULTIPLIER
  const totalRate = muniRate + eduRate

  const municipalTax = (assessedValue * muniRate) / 1000
  const educationTax = (assessedValue * eduRate) / 1000
  const totalAnnualTax = municipalTax + educationTax
  const totalMonthlyTax = totalAnnualTax / 12
  const effectiveRate = (totalAnnualTax / assessedValue) * 100

  const filteredMunis = MUNICIPALITIES.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.region.toLowerCase().includes(search.toLowerCase())
  )

  const sortedForTable = useMemo(() => {
    return [...MUNICIPALITIES].sort((a, b) => {
      let aVal: number | string, bVal: number | string
      if (sortField === "name") { aVal = a.name; bVal = b.name }
      else if (sortField === "total") { aVal = a.municipalRate + a.educationRate; bVal = b.municipalRate + b.educationRate }
      else if (sortField === "municipal") { aVal = a.municipalRate; bVal = b.municipalRate }
      else { aVal = a.avgHomePrice; bVal = b.avgHomePrice }
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      return sortDir === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal
    })
  }, [sortField, sortDir])

  const tableToShow = showAllMunis ? sortedForTable : sortedForTable.slice(0, 10)

  const cheapestMuni = [...MUNICIPALITIES].sort((a, b) => (a.municipalRate + a.educationRate) - (b.municipalRate + b.educationRate))[0]
  const mostExpMuni = [...MUNICIPALITIES].sort((a, b) => (b.municipalRate + b.educationRate) - (a.municipalRate + a.educationRate))[0]

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  function handleValueInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "")
    const num = parseInt(digits || "0", 10)
    setInputValue(num.toLocaleString("en-CA"))
    setAssessedValue(Math.min(Math.max(num, 0), 5000000))
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>
    return sortDir === "asc" ? <ChevronUp className="inline w-3.5 h-3.5 ml-1 text-amber-600" /> : <ChevronDown className="inline w-3.5 h-3.5 ml-1 text-amber-600" />
  }

  // Estimated tax on avg home for comparison table
  function estTax(muni: Municipality) {
    return ((muni.municipalRate + muni.educationRate) * muni.avgHomePrice) / 1000
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero / Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-5xl py-10">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-700 mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Alberta Tools
          </Link>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">2024 Rates</span>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">All Alberta Municipalities</span>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Free</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Alberta Property Tax Calculator
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl">
              Estimate your annual property tax for any Alberta municipality. Compare mill rates across {MUNICIPALITIES.length} cities and towns — and see exactly where your tax dollars go.
            </p>
          </div>

          {/* Key stat strip */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wide">Lowest rate</p>
              <p className="text-lg font-bold text-gray-900">{cheapestMuni.name}</p>
              <p className="text-sm text-gray-500">{(cheapestMuni.municipalRate + cheapestMuni.educationRate).toFixed(2)} mills</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-[11px] text-red-600 font-semibold uppercase tracking-wide">Highest rate</p>
              <p className="text-lg font-bold text-gray-900">{mostExpMuni.name}</p>
              <p className="text-sm text-gray-500">{(mostExpMuni.municipalRate + mostExpMuni.educationRate).toFixed(2)} mills</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Cities covered</p>
              <p className="text-lg font-bold text-gray-900">{MUNICIPALITIES.length}</p>
              <p className="text-sm text-gray-500">municipalities</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-[11px] text-green-600 font-semibold uppercase tracking-wide">No prov. income tax</p>
              <p className="text-lg font-bold text-gray-900">Alberta</p>
              <p className="text-sm text-gray-500">still has property tax</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-10 space-y-12">

        {/* ── CALCULATOR ── */}
        <section id="calculator">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Left: Inputs */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Your Property Details</h2>

              {/* Property type toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPropertyType("residential")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${propertyType === "residential" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"}`}
                  >
                    <Home className="w-4 h-4" /> Residential
                  </button>
                  <button
                    onClick={() => setPropertyType("nonResidential")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${propertyType === "nonResidential" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"}`}
                  >
                    <Building2 className="w-4 h-4" /> Non-Residential
                  </button>
                </div>
                {propertyType === "nonResidential" && (
                  <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    Non-residential rates are typically ~2.8× residential in Alberta. Verify with your municipality.
                  </p>
                )}
              </div>

              {/* Municipality select */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Municipality</label>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-amber-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${REGION_DOT[selectedMuni.region]}`} />
                    <span className="font-semibold text-gray-900">{selectedMuni.name}</span>
                    <span className="text-xs text-gray-400">{selectedMuni.region}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                </button>
                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          autoFocus
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search city or region…"
                          className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredMunis.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-400">No results</p>
                      )}
                      {filteredMunis.map(m => (
                        <button
                          key={m.name}
                          onClick={() => { setSelectedMuni(m); setShowDropdown(false); setSearch("") }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-left transition-colors ${selectedMuni.name === m.name ? "bg-amber-50" : ""}`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${REGION_DOT[m.region]}`} />
                          <span className="flex-1 text-sm font-medium text-gray-900">{m.name}</span>
                          <span className="text-xs text-gray-400">{(m.municipalRate + m.educationRate).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Assessed value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessed Value
                  <span className="ml-2 text-xs font-normal text-gray-400">(from your tax notice or assessment)</span>
                </label>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-400 transition-colors">
                  <span className="text-gray-400 font-bold text-lg">$</span>
                  <input
                    value={inputValue}
                    onChange={e => handleValueInput(e.target.value)}
                    onFocus={e => e.target.select()}
                    inputMode="numeric"
                    className="flex-1 bg-transparent text-xl font-bold text-gray-900 outline-none"
                    placeholder="500,000"
                  />
                </div>
                <input
                  type="range"
                  min={50000}
                  max={2000000}
                  step={10000}
                  value={assessedValue}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    setAssessedValue(v)
                    setInputValue(v.toLocaleString("en-CA"))
                  }}
                  className="w-full mt-3 accent-amber-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>$50K</span>
                  <span>$500K</span>
                  <span>$1M</span>
                  <span>$1.5M</span>
                  <span>$2M</span>
                </div>
                {selectedMuni.avgHomePrice > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Avg. home in {selectedMuni.name}: ~{fmt(selectedMuni.avgHomePrice)}
                    <button
                      onClick={() => { setAssessedValue(selectedMuni.avgHomePrice); setInputValue(selectedMuni.avgHomePrice.toLocaleString("en-CA")) }}
                      className="ml-2 text-amber-600 underline underline-offset-2 hover:text-amber-800"
                    >Use this</button>
                  </p>
                )}
              </div>

              {/* Mill rate breakdown inputs (read-only) */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">{selectedMuni.name} 2024 Mill Rates</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Municipal rate</span>
                  <span className="font-bold text-gray-900">{fmtRate(muniRate)} / $1,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Education rate (provincial)</span>
                  <span className="font-bold text-gray-900">{fmtRate(eduRate)} / $1,000</span>
                </div>
                <div className="h-px bg-amber-200 my-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900">Total mill rate</span>
                  <span className="text-amber-800">{fmtRate(totalRate)} / $1,000</span>
                </div>
              </div>
            </div>

            {/* Right: Results */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-amber-100 text-sm font-semibold uppercase tracking-wide mb-1">Estimated Annual Property Tax</p>
                <p className="text-5xl font-extrabold tracking-tight">{fmt(totalAnnualTax)}</p>
                <p className="text-amber-200 text-sm mt-1">in {selectedMuni.name}{selectedMuni.notes ? ` (${selectedMuni.notes})` : ""}</p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-white/15 rounded-xl px-4 py-3">
                    <p className="text-amber-100 text-xs font-semibold uppercase tracking-wide">Monthly</p>
                    <p className="text-2xl font-bold">{fmt(totalMonthlyTax)}</p>
                    <p className="text-amber-200 text-xs">per month</p>
                  </div>
                  <div className="bg-white/15 rounded-xl px-4 py-3">
                    <p className="text-amber-100 text-xs font-semibold uppercase tracking-wide">Effective rate</p>
                    <p className="text-2xl font-bold">{effectiveRate.toFixed(3)}%</p>
                    <p className="text-amber-200 text-xs">of assessed value</p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Tax Breakdown</h3>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Municipal portion</span>
                    <span className="font-semibold text-gray-900">{fmt(municipalTax)}/yr</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${(municipalTax / totalAnnualTax) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{((municipalTax / totalAnnualTax) * 100).toFixed(0)}% — funds roads, parks, emergency services</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Education portion (provincial)</span>
                    <span className="font-semibold text-gray-900">{fmt(educationTax)}/yr</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${(educationTax / totalAnnualTax) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{((educationTax / totalAnnualTax) * 100).toFixed(0)}% — funds K-12 schools across Alberta</p>
                </div>
              </div>

              {/* Quick compare */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Same Property — Different Cities</h3>
                <div className="space-y-2">
                  {[
                    MUNICIPALITIES.find(m => m.name === "Canmore")!,
                    MUNICIPALITIES.find(m => m.name === "Calgary")!,
                    selectedMuni,
                    MUNICIPALITIES.find(m => m.name === "Edmonton")!,
                    MUNICIPALITIES.find(m => m.name === "Red Deer")!,
                  ]
                    .filter((m, i, arr) => arr.findIndex(x => x.name === m.name) === i)
                    .map(m => {
                      const tax = ((m.municipalRate + m.educationRate) * assessedValue) / 1000
                      const isSelected = m.name === selectedMuni.name
                      return (
                        <div
                          key={m.name}
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${isSelected ? "bg-amber-50 border border-amber-200" : ""}`}
                        >
                          <span className={`text-sm ${isSelected ? "font-bold text-amber-800" : "text-gray-600"}`}>
                            {m.name} {isSelected && "(selected)"}
                          </span>
                          <span className={`text-sm font-semibold ${isSelected ? "text-amber-800" : "text-gray-900"}`}>{fmt(tax)}/yr</span>
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Estimates use 2024 approximate mill rates from municipal budget documents.
                  Local improvement levies, BIA levies, and senior exemptions are not included.
                  Always verify with your municipality&apos;s tax office.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ARTICLE ── */}
        <section id="how-it-works" className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">How Property Tax Is Calculated in Alberta</h2>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-4">
            <p className="text-gray-700">
              Property tax in Alberta is calculated using a deceptively simple formula — but the numbers behind it can vary dramatically depending on which municipality you call home. Understanding how it works is the first step to knowing whether you&apos;re paying your fair share.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-amber-900 font-bold text-base mb-2">The Formula</p>
              <p className="text-amber-800 font-mono text-lg">
                Property Tax = (Assessed Value ÷ 1,000) × Mill Rate
              </p>
              <p className="text-amber-700 text-sm mt-2">
                Example: A $450,000 home in Calgary (total mill rate ~9.27) = $4,172/year
              </p>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mt-6">What Is the Mill Rate?</h3>
            <p className="text-gray-700">
              The mill rate is the tax rate expressed as dollars per $1,000 of assessed value. A mill rate of 10.00 means you pay $10 for every $1,000 your property is worth. Your total mill rate has two components: the <strong>municipal rate</strong> (set by your city or town council each spring) and the <strong>provincial education rate</strong> (set by the Government of Alberta to fund K-12 schools).
            </p>

            <h3 className="text-lg font-bold text-gray-900">What Is the Assessed Value?</h3>
            <p className="text-gray-700">
              Alberta uses <strong>market value assessment</strong>. Your municipality&apos;s assessor estimates what your property would have sold for on the open market as of July 1 of the previous year — using actual sales data, mass appraisal models, and property characteristics like size, age, condition, and location. You receive your assessment notice every January; if you disagree, you typically have until March or April to file a formal complaint with the Assessment Review Board.
            </p>

            <h3 className="text-lg font-bold text-gray-900">The Municipal Portion</h3>
            <p className="text-gray-700">
              The municipal portion of your property tax — typically 70–80% of your total bill — funds local services: roads, snow removal, fire and police services, parks, libraries, recreation centres, transit, and municipal administration. Council sets this rate each spring when it approves the annual budget. If your municipality decides to spend more, the mill rate goes up. If your assessed value rises faster than spending, the rate may go down.
            </p>

            <h3 className="text-lg font-bold text-gray-900">The Education Portion</h3>
            <p className="text-gray-700">
              The remaining ~20–30% of your property tax is a provincial education requisition. The Government of Alberta determines the total amount it needs from property taxpayers to fund K-12 education across the province. That total is then divided across all municipalities based on their equalized assessment. Your municipality collects it on the province&apos;s behalf and remits it to Alberta Education. You have no vote on this portion — it&apos;s set by the province, not your local council.
            </p>

            <h3 className="text-lg font-bold text-gray-900">Why Do Rates Vary So Much?</h3>
            <p className="text-gray-700">
              The gap between Calgary&apos;s mill rate (~9.27) and a small northern town like High Level (~16.90) comes down to three factors:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
              <li><strong>Assessment base size:</strong> Calgary has over 600,000 properties to distribute costs across; High Level has a few thousand. Fewer properties = higher rate per property.</li>
              <li><strong>Commercial/industrial tax base:</strong> Calgary&apos;s massive downtown office and retail sector pays non-residential rates (typically 2–3× residential). That commercial tax subsidy reduces pressure on homeowners.</li>
              <li><strong>Service costs:</strong> Remote municipalities face higher infrastructure costs per capita — longer roads, expensive utilities, and smaller economies of scale for services.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900">Non-Residential Property Tax</h3>
            <p className="text-gray-700">
              Commercial and industrial properties in Alberta are assessed and taxed at significantly higher mill rates than residential — typically 2.5–3× higher, depending on the municipality. This is a deliberate policy choice: the non-residential tax base cross-subsidizes residential ratepayers. Businesses generally pay more per dollar of assessed value than homeowners do.
            </p>

            <h3 className="text-lg font-bold text-gray-900">Senior Citizen Property Tax Deferral</h3>
            <p className="text-gray-700">
              Alberta offers a <strong>Property Tax Deferral Program</strong> for seniors (age 65+) who have lived in their home for at least one year and meet income requirements. Qualifying seniors can defer all or part of their annual property taxes until they sell their home. The deferred taxes accrue interest at prime rate. This can significantly reduce out-of-pocket costs for seniors on fixed incomes.
            </p>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section id="comparison">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">City-by-City Mill Rate Comparison</h2>
                <p className="text-sm text-gray-500 mt-0.5">2024 approximate residential mill rates · Click columns to sort</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {(Object.entries(REGION_COLORS) as [Municipality["region"], string][]).map(([r, cls]) => (
                  <span key={r} className={`px-2.5 py-1 rounded-full border ${cls}`}>{r}</span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-amber-700 whitespace-nowrap" onClick={() => handleSort("name")}>
                      Municipality <SortIcon field="name" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Region</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-amber-700 whitespace-nowrap" onClick={() => handleSort("municipal")}>
                      Municipal <SortIcon field="municipal" />
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Education</th>
                    <th className="text-right px-4 py-3 font-semibold text-amber-700 cursor-pointer hover:text-amber-900 whitespace-nowrap" onClick={() => handleSort("total")}>
                      Total Mill <SortIcon field="total" />
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-amber-700 whitespace-nowrap" onClick={() => handleSort("avgHomePrice")}>
                      Avg Home <SortIcon field="avgHomePrice" />
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Est. Tax on Avg Home</th>
                  </tr>
                </thead>
                <tbody>
                  {tableToShow.map((m, i) => {
                    const total = m.municipalRate + m.educationRate
                    const isSelected = m.name === selectedMuni.name
                    return (
                      <tr
                        key={m.name}
                        onClick={() => { setSelectedMuni(m); setAssessedValue(m.avgHomePrice); setInputValue(m.avgHomePrice.toLocaleString("en-CA")); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                        className={`border-b border-gray-50 hover:bg-amber-50 cursor-pointer transition-colors ${isSelected ? "bg-amber-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {m.name}
                          {m.notes && <span className="ml-1 text-xs text-gray-400">({m.notes})</span>}
                          {isSelected && <span className="ml-2 text-xs font-bold text-amber-600">← selected</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${REGION_COLORS[m.region]}`}>{m.region}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">{m.municipalRate.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">{m.educationRate.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded ${total < 9 ? "text-green-700 bg-green-50" : total < 11 ? "text-amber-700 bg-amber-50" : total < 13 ? "text-orange-700 bg-orange-50" : "text-red-700 bg-red-50"}`}>
                            {total.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(m.avgHomePrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(estTax(m))}/yr</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!showAllMunis && sortedForTable.length > 10 && (
              <div className="px-6 py-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => setShowAllMunis(true)}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 mx-auto"
                >
                  Show all {MUNICIPALITIES.length} municipalities <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            {showAllMunis && (
              <div className="px-6 py-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => setShowAllMunis(false)}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 mx-auto"
                >
                  Show less <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="px-6 pb-4">
              <p className="text-xs text-gray-400">
                Click any row to load that municipality into the calculator above. Rates are approximate 2024 residential values.
                <span className="inline-flex items-center gap-1 ml-3"><span className="px-2 py-0.5 rounded text-xs text-green-700 bg-green-50">&lt; 9</span> Low</span>
                <span className="inline-flex items-center gap-1 ml-2"><span className="px-2 py-0.5 rounded text-xs text-amber-700 bg-amber-50">9–11</span> Mid</span>
                <span className="inline-flex items-center gap-1 ml-2"><span className="px-2 py-0.5 rounded text-xs text-orange-700 bg-orange-50">11–13</span> High</span>
                <span className="inline-flex items-center gap-1 ml-2"><span className="px-2 py-0.5 rounded text-xs text-red-700 bg-red-50">&gt; 13</span> Very High</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── KEY INSIGHTS ── */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <TrendingDown className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Lowest Rates</h3>
            <p className="text-sm text-gray-600 mb-3">Mountain and fast-growing suburban towns often have Alberta&apos;s lowest residential mill rates — partly offset by higher home prices.</p>
            <div className="space-y-1">
              {[...MUNICIPALITIES].sort((a, b) => (a.municipalRate + a.educationRate) - (b.municipalRate + b.educationRate)).slice(0, 4).map(m => (
                <div key={m.name} className="flex justify-between text-xs">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="font-semibold text-green-700">{(m.municipalRate + m.educationRate).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <MapPin className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Big City Comparison</h3>
            <p className="text-sm text-gray-600 mb-3">Calgary consistently maintains a lower mill rate than Edmonton due to its stronger commercial assessment base.</p>
            <div className="space-y-2">
              {["Calgary", "Edmonton", "Lethbridge", "Red Deer", "Medicine Hat"].map(city => {
                const m = MUNICIPALITIES.find(x => x.name === city)!
                return (
                  <div key={city} className="flex justify-between text-xs">
                    <span className="text-gray-700">{city}</span>
                    <span className="font-semibold text-amber-700">{(m.municipalRate + m.educationRate).toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <TrendingUp className="w-8 h-8 text-red-400 mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Highest Rates</h3>
            <p className="text-sm text-gray-600 mb-3">Remote northern communities carry the heaviest mill rates — smaller assessment bases must still fund full municipal services.</p>
            <div className="space-y-1">
              {[...MUNICIPALITIES].sort((a, b) => (b.municipalRate + b.educationRate) - (a.municipalRate + a.educationRate)).slice(0, 4).map(m => (
                <div key={m.name} className="flex justify-between text-xs">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="font-semibold text-red-600">{(m.municipalRate + m.educationRate).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-start justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900 text-sm leading-snug">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 mt-0.5 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── DISCLAIMER ── */}
        <div className="flex items-start gap-3 bg-gray-100 rounded-xl p-4 text-sm text-gray-500">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
          <div>
            <strong className="text-gray-700">For informational purposes only.</strong> Mill rates shown are approximate 2024 residential values compiled from municipal budget documents and the Alberta Municipal Affairs office. Actual rates may differ. This calculator does not account for local improvement levies, BIA levies, senior deferral programs, or assessment appeals. Contact your municipality or a property tax professional before making financial decisions.
          </div>
        </div>

        {/* ── RELATED TOOLS ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">More Alberta Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { href: "/tools/calgary-vs-edmonton-cost-of-living", title: "Calgary vs Edmonton Cost of Living", desc: "Full comparison of rent, groceries, transit, and home prices between Alberta's two biggest cities." },
              { href: "/tools/aish-calculator", title: "AISH Calculator", desc: "Estimate your 2026 AISH monthly payment including exemptions, child benefits, and clawback." },
              { href: "/tools/alberta-rental-increase-calculator", title: "Rental Increase Calculator", desc: "Check if a rent increase follows Alberta's 3-month notice and 12-month frequency rules." },
            ].map(t => (
              <Link key={t.href} href={t.href} className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-amber-200 transition-all block">
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-700 mb-1 transition-colors text-sm">{t.title}</h3>
                <p className="text-xs text-gray-500">{t.desc}</p>
                <p className="mt-3 text-xs font-semibold text-amber-600 flex items-center gap-1">Open tool <ArrowRight className="w-3.5 h-3.5" /></p>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
