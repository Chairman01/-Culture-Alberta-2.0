"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  ArrowRight, ExternalLink, Search, Zap, MapPin, Factory, Droplets, Users, Building2, X,
} from "lucide-react"
import {
  ALBERTA_REFERENCE, HOMES_PER_MW, STATUS_LABEL, POWER_LABEL, WORKLOAD_LABEL,
  totals, isActive,
  type DcStatus, type DcPower, type DcRegion, type DcWorkload,
} from "@/lib/data/alberta-data-centres"
import { TRACKER_PATH, type TrackedDataCentre, type DcUpdate } from "@/lib/data-centres"

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
})

export interface RelatedArticle {
  slug: string
  title: string
  imageUrl: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const fmtMW = (mw: number | null) =>
  mw == null ? "Not disclosed" : mw >= 1000 ? `${(mw / 1000).toLocaleString("en-CA", { maximumFractionDigits: 1 })} GW` : `${mw.toLocaleString("en-CA")} MW`

const fmtCost = (m: number | null) =>
  m == null ? null : m >= 1000 ? `$${(m / 1000).toLocaleString("en-CA", { maximumFractionDigits: 0 })}B` : `$${m.toLocaleString("en-CA")}M`

const fmtInt = (n: number) => n.toLocaleString("en-CA")

const STATUS_CHIP: Record<DcStatus, string> = {
  proposed: "bg-amber-100 text-amber-800",
  approved: "bg-violet-100 text-violet-800",
  "under-construction": "bg-blue-100 text-blue-800",
  operating: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
}

const STATUS_ORDER: DcStatus[] = ["under-construction", "approved", "proposed", "operating", "inactive"]
const REGIONS: DcRegion[] = [
  "Edmonton Region", "Calgary Region", "Central Alberta", "Southern Alberta", "Northwest Alberta", "Northeast Alberta",
]
const POWERS: DcPower[] = ["grid", "onsite-gas", "grid+onsite", "other", "undisclosed"]
const WORKLOADS: DcWorkload[] = ["ai", "crypto", "colocation", "mixed", "undisclosed"]

type SortKey = "mw-desc" | "mw-asc" | "name" | "status"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  items: TrackedDataCentre[]
  recentUpdates: DcUpdate[]
  lastReviewed: string
  inventoryFetchedAt: string | null
  articles: RelatedArticle[]
}

const fmtDay = (d: string) => new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })

export default function DataCentresClient({ items: DATA_CENTRES, recentUpdates, lastReviewed, inventoryFetchedAt, articles }: Props) {
  const nameOf = (id: string) => DATA_CENTRES.find(d => d.id === id)?.name ?? id.replace("inventory:", "Inventory #")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<DcStatus | "active" | "all">("active")
  const [region, setRegion] = useState<DcRegion | "all">("all")
  const [power, setPower] = useState<DcPower | "all">("all")
  const [workload, setWorkload] = useState<DcWorkload | "all">("all")
  const [sort, setSort] = useState<SortKey>("mw-desc")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Bill widget state
  const [monthlyBill, setMonthlyBill] = useState(180)
  // Scale widget state
  const [scaleId, setScaleId] = useState("meta-sturgeon")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = DATA_CENTRES.filter(dc => {
      if (status === "active" ? !isActive(dc) : status !== "all" && dc.status !== status) return false
      if (region !== "all" && dc.region !== region) return false
      if (power !== "all" && dc.power !== power) return false
      if (workload !== "all" && dc.workload !== workload) return false
      if (q) {
        const hay = `${dc.name} ${dc.operator} ${dc.municipality} ${dc.region} ${dc.summary}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name)
      if (sort === "status") {
        const d = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        return d !== 0 ? d : (b.demandMW ?? 0) - (a.demandMW ?? 0)
      }
      const am = a.demandMW ?? -1, bm = b.demandMW ?? -1
      return sort === "mw-asc" ? am - bm : bm - am
    })
  }, [DATA_CENTRES, query, status, region, power, workload, sort])

  const all = totals(DATA_CENTRES)
  const shown = totals(filtered)
  const selected = selectedId ? DATA_CENTRES.find(dc => dc.id === selectedId) ?? null : null
  const scaleDc = DATA_CENTRES.find(dc => dc.id === scaleId) ?? DATA_CENTRES[0]
  const scaleMW = scaleDc.demandMW ?? 0

  const resetFilters = () => {
    setQuery(""); setStatus("active"); setRegion("all"); setPower("all"); setWorkload("all")
  }
  const hasFilters = query || status !== "active" || region !== "all" || power !== "all" || workload !== "all"

  const monthlyLow = ALBERTA_REFERENCE.pembinaBillLow / 12
  const monthlyHigh = ALBERTA_REFERENCE.pembinaBillHigh / 12

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="container mx-auto px-4 max-w-6xl py-12 md:py-16">
          <nav className="text-xs text-slate-300 mb-4 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/tools" className="hover:text-white">Alberta Tools</Link><span>/</span>
            <span className="text-white">Data Centres</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Alberta Data Centre Tracker
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-3xl">
            Every proposed, approved, under-construction and operating data centre in Alberta, on one map: who is
            building it, how much power it needs, where that power comes from, and what it could mean for your
            electricity bill.
          </p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Projects tracked" value={fmtInt(all.total)} sub={`${all.active} proposed or building`} />
            <Stat label="Proposed new demand" value={fmtMW(all.proposedMW)} sub={`vs ${fmtMW(ALBERTA_REFERENCE.recordPeakMW)} Alberta record peak`} />
            <Stat label="Allowed on the grid so far" value={fmtMW(ALBERTA_REFERENCE.aesoPhase1MW)} sub={`of ${fmtMW(ALBERTA_REFERENCE.aesoRequestedMW)} requested`} />
            <Stat label="Operating today" value={fmtMW(all.operatingMW)} sub={`across ${all.operating} sites`} />
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Reported and maintained by the Culture Alberta newsroom · List reviewed {fmtDay(lastReviewed)}
            {inventoryFetchedAt ? ` · Provincial inventory checked ${fmtDay(inventoryFetchedAt.slice(0, 10))}` : ""}.
            Demand totals only count projects with a published megawatt figure; Wonder Valley&apos;s 7.5 GW alone is a third of it.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl py-10 space-y-12">
        {/* ---------------------------------------------------------------- */}
        {/* Change log                                                        */}
        {/* ---------------------------------------------------------------- */}
        {recentUpdates.length > 0 && (
          <section aria-labelledby="changes-heading" className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 id="changes-heading" className="text-2xl font-bold text-gray-900">What changed recently</h2>
              <p className="text-xs text-gray-400">Green entries come straight from the province&apos;s daily inventory feed; blue ones are ours.</p>
            </div>
            <ol className="mt-4 grid md:grid-cols-2 gap-x-8 gap-y-3">
              {recentUpdates.map(u => (
                <li key={u.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${u.kind === "inventory" ? "bg-emerald-500" : "bg-blue-600"}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{fmtDay(u.happenedOn)}</p>
                    <p className="text-gray-900">
                      {u.dcId.startsWith("inventory:")
                        ? <span className="font-semibold">{nameOf(u.dcId)}</span>
                        : <Link href={`${TRACKER_PATH}/${u.dcId}`} className="font-semibold hover:text-blue-700">{nameOf(u.dcId)}</Link>}
                      {" — "}{u.headline}
                    </p>
                    {u.detail && <p className="text-xs text-gray-500 mt-0.5">{u.detail}</p>}
                    {u.articleSlug && <Link href={`/articles/${u.articleSlug}`} className="text-xs text-blue-700 hover:underline">Read our story</Link>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Filters + map + list                                              */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="projects-heading">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 id="projects-heading" className="text-2xl font-bold text-gray-900">Every project on the map</h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filtered.length} of {all.total} · {fmtMW(shown.proposedMW)} of proposed demand in view
              </p>
            </div>
            {hasFilters && (
              <button onClick={resetFilters} className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <label className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, company or municipality"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search projects"
              />
            </label>
            <Select label="Status" value={status} onChange={v => setStatus(v as typeof status)}
              options={[["active", "Proposed & building"], ["all", "All statuses"], ...STATUS_ORDER.map(s => [s, STATUS_LABEL[s]] as [string, string])]} />
            <Select label="Region" value={region} onChange={v => setRegion(v as typeof region)}
              options={[["all", "All regions"], ...REGIONS.map(r => [r, r] as [string, string])]} />
            <Select label="Power" value={power} onChange={v => setPower(v as typeof power)}
              options={[["all", "Any power source"], ...POWERS.map(p => [p, POWER_LABEL[p]] as [string, string])]} />
            <Select label="Use" value={workload} onChange={v => setWorkload(v as typeof workload)}
              options={[["all", "Any workload"], ...WORKLOADS.map(w => [w, WORKLOAD_LABEL[w]] as [string, string])]} />
            <Select label="Sort" value={sort} onChange={v => setSort(v as SortKey)}
              options={[["mw-desc", "Largest first"], ["mw-asc", "Smallest first"], ["status", "By status"], ["name", "A to Z"]]} />
          </div>

          <div id="dc-map" className="scroll-mt-20">
            <MapView items={filtered} selectedId={selectedId} onSelect={dc => setSelectedId(dc.id)} />
          </div>

          {selected && (
            <div className="mt-4">
              <DetailCard dc={selected} onClose={() => setSelectedId(null)} expanded />
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filtered.map(dc => (
              <DetailCard
                key={dc.id}
                dc={dc}
                expanded={false}
                onOpen={() => {
                  setSelectedId(dc.id)
                  document.getElementById("dc-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm md:col-span-2 py-8 text-center">No projects match those filters.</p>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Bill impact                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="bill-heading" className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <h2 id="bill-heading" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> Will data centres raise my power bill?
          </h2>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Under Alberta&apos;s rules, a data centre must bring its own power plant, but it is allowed to draw from the
            shared grid while that plant is being built. The Pembina Institute modelled what the Meta project alone
            could do to wholesale prices during that gap and estimated an average household is at risk of paying an
            extra <strong>${ALBERTA_REFERENCE.pembinaBillLow}–${ALBERTA_REFERENCE.pembinaBillHigh} a year</strong> from 2027 to 2031.
            The province disputes the framing, saying wholesale and retail prices are not the same thing and that
            Meta-funded grid upgrades could cut transmission charges by up to 6 percent.
          </p>
          <div className="mt-6 grid md:grid-cols-[1fr_1.4fr] gap-6 items-start">
            <div>
              <label htmlFor="bill" className="text-sm font-semibold text-gray-800">Your current monthly electricity bill</label>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-gray-400 text-lg">$</span>
                <input
                  id="bill"
                  type="number"
                  min={20}
                  max={2000}
                  value={monthlyBill}
                  onChange={e => setMonthlyBill(Math.max(0, Number(e.target.value) || 0))}
                  className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">per month</span>
              </div>
              <input
                type="range" min={40} max={600} step={5} value={monthlyBill}
                onChange={e => setMonthlyBill(Number(e.target.value))}
                className="w-full mt-3 accent-blue-600" aria-label="Monthly bill slider"
              />
              <p className="text-xs text-gray-400 mt-2">Use the total on your bill, including delivery and fees.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Big label="Extra per month (low)" value={`$${monthlyLow.toFixed(0)}`} sub={`+${pct(monthlyLow, monthlyBill)} on your bill`} tone="amber" />
              <Big label="Extra per month (high)" value={`$${monthlyHigh.toFixed(0)}`} sub={`+${pct(monthlyHigh, monthlyBill)} on your bill`} tone="red" />
              <Big label="Extra per year" value={`$${ALBERTA_REFERENCE.pembinaBillLow}–$${ALBERTA_REFERENCE.pembinaBillHigh}`} sub="2027 to 2031, one project" tone="slate" />
              <Big label="Over five years" value={`$${fmtInt(ALBERTA_REFERENCE.pembinaBillLow * 5)}–$${fmtInt(ALBERTA_REFERENCE.pembinaBillHigh * 5)}`} sub="if the estimate holds" tone="slate" />
            </div>
          </div>
          <div className="mt-5 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 space-y-2">
            <p><strong>What this is:</strong> the Pembina Institute&apos;s published range for one project (Meta, 970 MW) drawing grid power before its own plant is running. It is a modelled risk, not a rate change on your bill.</p>
            <p><strong>What it is not:</strong> a forecast for every project on this page. If more data centres connect the same way before their generation is built, the effect would be larger; if they bring power first, it would be smaller. Fixed-rate contracts shield you from wholesale swings until they renew.</p>
            <p className="text-xs text-gray-400">
              Source: Pembina Institute, <a className="underline" href="https://www.pembina.org/pub/footing-bill" target="_blank" rel="noopener noreferrer">Footing the Bill</a> (2026); Government of Alberta, <a className="underline" href="https://www.alberta.ca/datacentres/index.html" target="_blank" rel="noopener noreferrer">AI Data Centres in Alberta</a>.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Scale                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="scale-heading" className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <h2 id="scale-heading" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="w-6 h-6 text-blue-600" /> How big is a gigawatt, really?
          </h2>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Pick a project to see its full-build power demand next to things you already know.
          </p>
          <div className="mt-5">
            <label htmlFor="scale" className="text-sm font-semibold text-gray-800">Project</label>
            <select
              id="scale"
              value={scaleId}
              onChange={e => setScaleId(e.target.value)}
              className="mt-2 w-full md:w-auto px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
            >
              {[...DATA_CENTRES].filter(dc => dc.demandMW).sort((a, b) => (b.demandMW ?? 0) - (a.demandMW ?? 0)).map(dc => (
                <option key={dc.id} value={dc.id}>{dc.name} · {fmtMW(dc.demandMW)}</option>
              ))}
            </select>
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <Big label="Homes it could power" value={fmtInt(Math.round(scaleMW * HOMES_PER_MW))} sub={`Alberta has about 1.8 million households`} tone="blue" />
            <Big label="Share of Alberta's record peak" value={pct(scaleMW, ALBERTA_REFERENCE.recordPeakMW)} sub={`peak was ${fmtMW(ALBERTA_REFERENCE.recordPeakMW)} in January 2024`} tone="blue" />
            <Big label="Cities the size of Calgary" value={(scaleMW / ALBERTA_REFERENCE.calgaryAverageMW).toLocaleString("en-CA", { maximumFractionDigits: 1 })} sub={`Calgary averages ~${fmtMW(ALBERTA_REFERENCE.calgaryAverageMW)}`} tone="blue" />
          </div>
          <Bar
            label="This project vs Alberta's record peak demand"
            value={scaleMW}
            max={ALBERTA_REFERENCE.recordPeakMW}
            valueLabel={fmtMW(scaleMW)}
            maxLabel={fmtMW(ALBERTA_REFERENCE.recordPeakMW)}
          />
          <p className="text-xs text-gray-400 mt-3">
            Homes figure assumes the site runs flat out, which AI data centres largely do. Household use from typical
            Alberta consumption of about 600 kWh per month.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Policy explainer                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="rules-heading" className="grid md:grid-cols-2 gap-4">
          <h2 id="rules-heading" className="text-2xl font-bold text-gray-900 md:col-span-2">The rules in plain language</h2>
          <Rule icon={<Zap className="w-5 h-5" />} title="Bring your own power">
            Large data centres must supply their own generation instead of competing for grid capacity. Alberta&apos;s
            Data Centre Regulation (in force June 2026) puts projects that pair demand with new generation or storage
            at the front of the connection queue. In practice, the province has steered that generation to natural gas.
          </Rule>
          <Rule icon={<Building2 className="w-5 h-5" />} title="Connect now, build later">
            The catch: a project can draw grid power before its plant is finished. AESO let 1,200 MW on under an
            interim cap, all of it taken by Meta (970 MW) and TransAlta&apos;s Keephills (230 MW), against roughly
            19,565 MW of requests. This gap is where the bill-impact debate lives.
          </Rule>
          <Rule icon={<Droplets className="w-5 h-5" />} title="Water">
            All water use needs a Water Act licence. New licences are the most junior in a basin, so they are cut first
            in a shortage. Southern Alberta&apos;s river basins have been closed to new surface-water licences since
            2006. Meta says its cooling loop uses no operational water; most proposals have not published a figure.
          </Rule>
          <Rule icon={<Users className="w-5 h-5" />} title="What the province gets">
            A levy of up to 2 percent on computing equipment, plus property taxes and gas royalties, with no subsidies
            or discounted power. Qualifying projects over $250 million get permit decisions within 120 days under the
            Expedited 120-Day Approvals Act, 2026. Ottawa&apos;s Responsible Data Centre Development Principles are
            voluntary and do not override provincial approvals.
          </Rule>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Related coverage                                                  */}
        {/* ---------------------------------------------------------------- */}
        {articles.length > 0 && (
          <section aria-labelledby="news-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="news-heading" className="text-2xl font-bold text-gray-900">Latest data centre coverage</h2>
              <Link href="/alberta" className="text-sm text-blue-700 hover:underline flex items-center gap-1">More from Alberta <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {articles.map(a => (
                <Link key={a.slug} href={`/articles/${a.slug}`} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {a.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 line-clamp-2 leading-snug">{a.title}</h3>
                    <p className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Method                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="method-heading" className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 text-sm text-gray-700 leading-relaxed">
          <h2 id="method-heading" className="text-2xl font-bold text-gray-900 mb-3">How we build this list</h2>
          <p>
            We start from filings, not press releases: AESO&apos;s large-load connection list, the Government of Alberta&apos;s
            Major Projects Inventory, Alberta Utilities Commission power-plant applications, and county development
            permits. Where a project exists only in a company announcement or a news report, we say so with a
            &ldquo;Reported&rdquo; label rather than dress it up. Every record links the documents it rests on.
          </p>
          <p className="mt-3">
            The province&apos;s inventory is re-checked every morning. When it moves a project to a new stage, changes a
            cost, or lists a new data centre we do not have, that lands in the change log above automatically with the
            date. Editors re-verify each record by hand, and the &ldquo;last verified&rdquo; date on every project page is
            the honest answer to how fresh it is.
          </p>
          <p className="mt-3">
            Megawatt figures are the proponent&apos;s or the regulator&apos;s, at full build unless noted. Map pins sit on the
            municipality, not the parcel, because most sites have not published a legal land description. If you know
            of a project we are missing or a status that has moved, write to us and we will check the filing.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Sources                                                           */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="sources-heading" className="text-sm text-gray-600">
          <h2 id="sources-heading" className="text-lg font-bold text-gray-900 mb-2">Sources and further reading</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              ["AESO — Large load projects and connection list", "https://www.aeso.ca/grid/connecting-to-the-grid/large-load-projects/"],
              ["Government of Alberta — AI Data Centres in Alberta", "https://www.alberta.ca/datacentres/index.html"],
              ["Alberta Major Projects Inventory", "https://majorprojects.alberta.ca/"],
              ["Alberta Utilities Commission", "https://www.auc.ab.ca/"],
              ["Pembina Institute — Footing the Bill", "https://www.pembina.org/pub/footing-bill"],
              ["Meta — Breaking ground in Sturgeon County", "https://about.fb.com/news/2026/07/breaking-ground-on-metas-first-data-center-in-canada/"],
              ["Canada's Responsible Data Centre Development Principles", "https://ised-isde.canada.ca/site/ised/en/canadas-responsible-data-centre-development-principles"],
              ["Alberta Data Centre Watch (independent tracker)", "https://albertadatacentrewatch.ca/"],
            ].map(([label, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 inline-flex items-center gap-1">
                  {label} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-4">
            Know of a project we are missing, or a status that has changed? Email us and we will check the filing.
            Megawatt figures are as published by the proponent or regulator and change as projects are re-scoped.
          </p>
        </section>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function pct(part: number, whole: number): string {
  if (!whole) return "—"
  const v = (part / whole) * 100
  return `${v.toLocaleString("en-CA", { maximumFractionDigits: v < 10 ? 1 : 0 })}%`
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
      <p className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs text-slate-300 mt-1">{sub}</p>
    </div>
  )
}

const TONES = {
  amber: "bg-amber-50 border-amber-100 text-amber-900",
  red: "bg-red-50 border-red-100 text-red-900",
  blue: "bg-blue-50 border-blue-100 text-blue-900",
  slate: "bg-slate-50 border-slate-200 text-slate-900",
}
function Big({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: keyof typeof TONES }) {
  return (
    <div className={`rounded-xl border p-4 ${TONES[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide font-semibold opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      <p className="text-xs mt-1 opacity-70">{sub}</p>
    </div>
  )
}

function Bar({ label, value, max, valueLabel, maxLabel }: { label: string; value: number; max: number; valueLabel: string; maxLabel: string }) {
  const w = Math.min(100, (value / max) * 100)
  return (
    <div className="mt-6">
      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span>{maxLabel}</span></div>
      <div className="h-6 rounded-full bg-gray-100 overflow-hidden relative">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${w}%` }} />
        <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-white mix-blend-difference">{valueLabel}</span>
      </div>
    </div>
  )
}

function Rule({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-gray-900 font-bold"><span className="text-blue-600">{icon}</span>{title}</div>
      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{children}</p>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function DetailCard({ dc, expanded, onOpen, onClose }: { dc: TrackedDataCentre; expanded: boolean; onOpen?: () => void; onClose?: () => void }) {
  const cost = fmtCost(dc.costM)
  const href = `${TRACKER_PATH}/${dc.id}`
  return (
    <article className={`bg-white rounded-2xl border ${expanded ? "border-gray-900 shadow-lg" : "border-gray-200"} p-5 flex flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={`px-2.5 py-1 rounded-full font-medium ${STATUS_CHIP[dc.status]}`}>{STATUS_LABEL[dc.status]}</span>
            <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{dc.municipality}</span>
            <span className={`px-2 py-0.5 rounded-full border ${dc.tier === "primary" ? "border-emerald-200 text-emerald-700" : "border-gray-200 text-gray-500"}`} title={dc.tier === "primary" ? "Backed by a government, regulator or municipal record" : "Company material or press coverage only"}>
              {dc.tier === "primary" ? "Filed" : "Reported"}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug"><Link href={href} className="hover:text-blue-700">{dc.name}</Link></h3>
          <p className="text-sm text-gray-500">{dc.operator}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtMW(dc.demandMW)}</p>
          {cost && <p className="text-xs text-gray-500">{cost} cost</p>}
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{dc.summary}</p>
      {dc.inventory && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 mt-3">
          Province lists it as <strong>{dc.inventory.stage.toLowerCase()}</strong>
          {dc.inventory.costM ? ` at ${fmtCost(dc.inventory.costM)}` : ""}
          {dc.inventory.schedule || dc.inventory.scheduleEnd ? `, ${[dc.inventory.schedule, dc.inventory.scheduleEnd].filter(Boolean).join("–")}` : ""}.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Row k="Power" v={POWER_LABEL[dc.power]} />
        <Row k="Use" v={WORKLOAD_LABEL[dc.workload]} />
        {dc.demandNote && <Row k="Demand" v={dc.demandNote} wide />}
        {expanded && (
          <>
            <Row k="Power detail" v={dc.powerNote} wide />
            <Row k="Timeline" v={dc.timeline} wide />
            {dc.water && <Row k="Water" v={dc.water} wide />}
            {(dc.jobsConstruction || dc.jobsPermanent) && (
              <Row k="Jobs" v={[dc.jobsConstruction && `${fmtInt(dc.jobsConstruction)} construction`, dc.jobsPermanent && `${fmtInt(dc.jobsPermanent)} permanent`].filter(Boolean).join(" · ")} wide />
            )}
            <Row k="Last verified" v={fmtDay(dc.verifiedOn)} />
            {dc.demandMW ? <Row k="Equivalent" v={`${fmtInt(Math.round(dc.demandMW * HOMES_PER_MW))} homes · ${pct(dc.demandMW, ALBERTA_REFERENCE.recordPeakMW)} of Alberta's record peak`} wide /> : null}
          </>
        )}
      </dl>

      <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {dc.sources.map(s => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">
              {s.label} <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {dc.articles.length > 0 && <span className="text-gray-500">{dc.articles.length} {dc.articles.length === 1 ? "story" : "stories"}</span>}
          {expanded
            ? <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
            : <button onClick={onOpen} className="font-semibold text-blue-700 hover:underline">Show on map</button>}
          <Link href={href} className="font-semibold text-blue-700 hover:underline">Full profile →</Link>
        </div>
      </div>
      {expanded && dc.articles.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
          {dc.articles.slice(0, 4).map(a => (
            <li key={a.slug}><Link href={`/articles/${a.slug}`} className="text-gray-800 hover:text-blue-700">{a.title}</Link></li>
          ))}
        </ul>
      )}
    </article>
  )
}

function Row({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-gray-400 inline">{k}: </dt>
      <dd className="text-gray-700 inline">{v}</dd>
    </div>
  )
}
