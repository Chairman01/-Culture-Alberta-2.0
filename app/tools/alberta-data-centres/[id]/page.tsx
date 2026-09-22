import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Zap, Droplets, Users, Calendar, ShieldCheck, FileText } from "lucide-react"
import { ToolFaq } from "@/components/tool-faq"
import { getTrackedDataCentre, TRACKER_PATH, type TrackedDataCentre } from "@/lib/data-centres"
import {
  DATA_CENTRES, ALBERTA_REFERENCE, HOMES_PER_MW, STATUS_LABEL, POWER_LABEL, WORKLOAD_LABEL,
} from "@/lib/data/alberta-data-centres"
import ProjectMap from "../project-map"

export const revalidate = 3600
export const dynamicParams = false

const SITE = "https://www.culturealberta.com"

export function generateStaticParams() {
  return DATA_CENTRES.map(dc => ({ id: dc.id }))
}

const fmtMW = (mw: number | null) =>
  mw == null ? "not disclosed" : mw >= 1000 ? `${(mw / 1000).toLocaleString("en-CA", { maximumFractionDigits: 1 })} GW` : `${mw.toLocaleString("en-CA")} MW`
const fmtCost = (m: number | null) =>
  m == null ? null : m >= 1000 ? `$${(m / 1000).toLocaleString("en-CA", { maximumFractionDigits: 1 })} billion` : `$${m.toLocaleString("en-CA")} million`
const fmtDate = (d: string) => new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
const pct = (part: number, whole: number) => `${((part / whole) * 100).toLocaleString("en-CA", { maximumFractionDigits: 1 })}%`

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const dc = DATA_CENTRES.find(d => d.id === id)
  if (!dc) return {}
  const url = `${SITE}${TRACKER_PATH}/${dc.id}`
  const title = `${dc.name}: ${fmtMW(dc.demandMW)}, ${STATUS_LABEL[dc.status]} | Alberta Data Centre Tracker`
  const description = `${dc.name} in ${dc.municipality}, Alberta — ${STATUS_LABEL[dc.status].toLowerCase()}, ${fmtMW(dc.demandMW)}, ${POWER_LABEL[dc.power].toLowerCase()}. ${dc.summary}`.slice(0, 300)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Culture Alberta", locale: "en_CA", type: "article" },
    twitter: { card: "summary_large_image", title, description },
    other: { "geo.region": "CA-AB", "geo.placename": `${dc.municipality}, Alberta`, "geo.position": `${dc.lat};${dc.lng}`, ICBM: `${dc.lat}, ${dc.lng}` },
  }
}

function projectFaq(dc: TrackedDataCentre) {
  const items = [
    {
      q: `Where is ${dc.name}?`,
      a: `${dc.name} is in ${dc.municipality}, in the ${dc.region.replace(" Region", " region")} of Alberta. Its status as of ${fmtDate(dc.verifiedOn)} is ${STATUS_LABEL[dc.status].toLowerCase()}.`,
    },
    {
      q: `How much power will ${dc.name} use?`,
      a: dc.demandMW
        ? `${dc.name} is planned at ${fmtMW(dc.demandMW)} of electrical demand${dc.demandNote ? ` (${dc.demandNote})` : ""}. Running continuously, that is enough electricity for roughly ${Math.round(dc.demandMW * HOMES_PER_MW).toLocaleString("en-CA")} Alberta homes, or ${pct(dc.demandMW, ALBERTA_REFERENCE.recordPeakMW)} of the province's all-time record peak demand of ${ALBERTA_REFERENCE.recordPeakMW.toLocaleString("en-CA")} MW.`
        : `The proponent has not published an electrical demand figure for ${dc.name}.`,
    },
    {
      q: `Who is building ${dc.name} and how will it be powered?`,
      a: `${dc.operator}${dc.inventory?.developer && dc.inventory.developer !== dc.operator ? ` (listed by the province as ${dc.inventory.developer})` : ""}. Power: ${POWER_LABEL[dc.power].toLowerCase()}. ${dc.powerNote}`,
    },
  ]
  if (dc.water) items.push({ q: `How much water will ${dc.name} use?`, a: dc.water })
  if (dc.jobsConstruction || dc.jobsPermanent) {
    items.push({
      q: `How many jobs will ${dc.name} create?`,
      a: [dc.jobsConstruction && `About ${dc.jobsConstruction.toLocaleString("en-CA")} construction jobs at peak`, dc.jobsPermanent && `${dc.jobsPermanent.toLocaleString("en-CA")} permanent positions`].filter(Boolean).join(" and ") + ", according to the proponent. These are projections; Alberta has not required local-hiring commitments.",
    })
  }
  return items
}

export default async function DataCentreProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getTrackedDataCentre(id)
  if (!result) notFound()
  const { item: dc, all } = result

  const url = `${SITE}${TRACKER_PATH}/${dc.id}`
  const cost = fmtCost(dc.costM)
  const faq = projectFaq(dc)

  // Neighbours: same region, biggest first, excluding this one.
  const nearby = all
    .filter(d => d.id !== dc.id && d.region === dc.region)
    .sort((a, b) => (b.demandMW ?? 0) - (a.demandMW ?? 0))
    .slice(0, 4)

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Place",
      "@id": `${url}#place`,
      name: dc.name,
      description: dc.summary,
      url,
      geo: { "@type": "GeoCoordinates", latitude: dc.lat, longitude: dc.lng },
      address: { "@type": "PostalAddress", addressLocality: dc.municipality, addressRegion: "AB", addressCountry: "CA" },
      additionalProperty: [
        { "@type": "PropertyValue", name: "Status", value: STATUS_LABEL[dc.status] },
        { "@type": "PropertyValue", name: "Electrical demand", value: dc.demandMW ? `${dc.demandMW} MW` : "Not disclosed" },
        { "@type": "PropertyValue", name: "Power source", value: POWER_LABEL[dc.power] },
        { "@type": "PropertyValue", name: "Operator", value: dc.operator },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${dc.name}: status, power and what we know`,
      description: dc.summary,
      url,
      dateModified: dc.verifiedOn,
      author: { "@type": "Organization", name: "Culture Alberta", url: SITE },
      publisher: { "@type": "Organization", name: "Culture Alberta", url: SITE },
      about: { "@id": `${url}#place` },
      citation: dc.sources.map(s => s.url),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Alberta Tools", item: `${SITE}/tools` },
        { "@type": "ListItem", position: 3, name: "Alberta Data Centres", item: `${SITE}${TRACKER_PATH}` },
        { "@type": "ListItem", position: 4, name: dc.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ]

  return (
    <>
      {schema.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
          <div className="container mx-auto px-4 max-w-5xl py-10 md:py-14">
            <Link href={TRACKER_PATH} className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> All Alberta data centres
            </Link>
            <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
              <span className="px-2.5 py-1 rounded-full bg-white/15 font-medium">{STATUS_LABEL[dc.status]}</span>
              <span className="flex items-center gap-1 text-slate-300"><MapPin className="w-3 h-3" />{dc.municipality} · {dc.region}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">{dc.name}</h1>
            <p className="mt-3 text-lg text-slate-200 max-w-3xl">{dc.summary}</p>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Electrical demand" value={fmtMW(dc.demandMW)} sub={dc.demandNote ?? POWER_LABEL[dc.power]} />
              <Stat label="Capital cost" value={cost ?? "Not published"} sub={dc.inventory?.costM ? "per provincial inventory" : "as announced"} />
              <Stat label="Operator" value={dc.operator} sub={WORKLOAD_LABEL[dc.workload]} />
              <Stat label="Last verified" value={fmtDate(dc.verifiedOn)} sub={dc.tier === "primary" ? "Primary-source record" : "Reported, not yet filed"} />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 max-w-5xl py-10 grid lg:grid-cols-[1.6fr_1fr] gap-8">
          <div className="space-y-8">
            <ProjectMap dc={dc} />

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What we know</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Fact icon={<Zap className="w-4 h-4" />} k="Power" v={`${POWER_LABEL[dc.power]}. ${dc.powerNote}`} wide />
                <Fact icon={<Calendar className="w-4 h-4" />} k="Timeline" v={dc.timeline} wide />
                {dc.water && <Fact icon={<Droplets className="w-4 h-4" />} k="Water" v={dc.water} wide />}
                {(dc.jobsConstruction || dc.jobsPermanent) && (
                  <Fact icon={<Users className="w-4 h-4" />} k="Jobs" v={[dc.jobsConstruction && `${dc.jobsConstruction.toLocaleString("en-CA")} construction at peak`, dc.jobsPermanent && `${dc.jobsPermanent.toLocaleString("en-CA")} permanent`].filter(Boolean).join(" · ")} />
                )}
                {dc.demandMW ? (
                  <Fact icon={<Zap className="w-4 h-4" />} k="In perspective" v={`Enough for ~${Math.round(dc.demandMW * HOMES_PER_MW).toLocaleString("en-CA")} homes · ${pct(dc.demandMW, ALBERTA_REFERENCE.recordPeakMW)} of Alberta's record peak · ${(dc.demandMW / ALBERTA_REFERENCE.calgaryAverageMW).toLocaleString("en-CA", { maximumFractionDigits: 1 })}× Calgary's average draw`} />
                ) : null}
              </dl>
            </section>

            {dc.inventory && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Government of Alberta inventory</h2>
                <p className="text-sm text-gray-500 mt-1">How the province lists this project in its Major Projects Inventory, refreshed daily.</p>
                <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Row k="Listed as" v={dc.inventory.name} />
                  <Row k="Stage" v={dc.inventory.stage} />
                  <Row k="Cost" v={dc.inventory.costM ? fmtCost(dc.inventory.costM)! : "Not listed"} />
                  <Row k="Schedule" v={[dc.inventory.schedule, dc.inventory.scheduleEnd].filter(Boolean).join(" – ") || "Not listed"} />
                  <Row k="Developer" v={dc.inventory.developer ?? "Not listed"} />
                </dl>
                <a href={dc.inventory.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
                  View the provincial record <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </section>
            )}

            {dc.updates.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">What has changed</h2>
                <ol className="relative border-l border-gray-200 ml-2 space-y-5">
                  {dc.updates.map(u => (
                    <li key={u.id} className="pl-5">
                      <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ${u.kind === "inventory" ? "bg-emerald-500" : "bg-blue-600"}`} />
                      <p className="text-xs text-gray-400">{fmtDate(u.happenedOn)}{u.kind === "inventory" ? " · provincial inventory" : ""}</p>
                      <p className="font-semibold text-gray-900">{u.headline}</p>
                      {u.detail && <p className="text-sm text-gray-600 mt-0.5">{u.detail}</p>}
                      <div className="flex gap-3 mt-1 text-xs">
                        {u.articleSlug && <Link href={`/articles/${u.articleSlug}`} className="text-blue-700 hover:underline">Read our story</Link>}
                        {u.sourceUrl && <a href={u.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline inline-flex items-center gap-1">Source <ExternalLink className="w-3 h-3" /></a>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {dc.articles.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Our coverage of {dc.name}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {dc.articles.map(a => (
                    <Link key={a.slug} href={`/articles/${a.slug}`} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      {a.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 leading-snug line-clamp-2">{a.title}</h3>
                        {a.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.excerpt}</p>}
                        <p className="text-xs text-gray-400 mt-2">{fmtDate(a.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <ToolFaq title={`${dc.name} — questions people ask`} items={faq} />
          </div>

          <aside className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3">Sources for this record</h2>
              <ul className="space-y-2 text-sm">
                {dc.sources.map(s => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">{s.label} <ExternalLink className="w-3 h-3" /></a>
                  </li>
                ))}
                {dc.inventory && (
                  <li><a href={dc.inventory.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">Alberta Major Projects Inventory <ExternalLink className="w-3 h-3" /></a></li>
                )}
              </ul>
              <p className="text-xs text-gray-400 mt-4">
                {dc.tier === "primary"
                  ? "A government, regulator or municipal record backs this entry."
                  : "This entry rests on the proponent's own material or press coverage; we have not yet found a regulatory filing."}
                {" "}Map location is municipality-level, not the parcel.
              </p>
            </section>

            {nearby.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-3">Also in the {dc.region.replace(" Region", " region")}</h2>
                <ul className="divide-y divide-gray-100">
                  {nearby.map(n => (
                    <li key={n.id}>
                      <Link href={`${TRACKER_PATH}/${n.id}`} className="flex items-center justify-between py-2.5 text-sm group">
                        <span>
                          <span className="font-medium text-gray-900 group-hover:text-blue-700">{n.name}</span>
                          <span className="block text-xs text-gray-400">{n.municipality} · {STATUS_LABEL[n.status]}</span>
                        </span>
                        <span className="text-gray-600 font-semibold tabular-nums shrink-0 ml-3">{fmtMW(n.demandMW)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-blue-50 rounded-2xl border border-blue-100 p-5 text-sm">
              <h2 className="font-bold text-blue-900 mb-2">Will this affect your power bill?</h2>
              <p className="text-blue-900/80">
                The tracker&apos;s bill calculator explains the connect-now, build-later gap and what the Pembina Institute
                estimates it could cost an average household.
              </p>
              <Link href={`${TRACKER_PATH}#bill-heading`} className="mt-3 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                Open the calculator <ArrowRight className="w-4 h-4" />
              </Link>
            </section>
          </aside>
        </main>
      </div>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{label}</p>
      <p className="text-xl md:text-2xl font-bold mt-1 truncate" title={value}>{value}</p>
      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{sub}</p>
    </div>
  )
}

function Fact({ icon, k, v, wide }: { icon: React.ReactNode; k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 font-semibold"><span className="text-blue-600">{icon}</span>{k}</dt>
      <dd className="text-gray-700 mt-1 leading-relaxed">{v}</dd>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-gray-400 inline">{k}: </dt>
      <dd className="text-gray-800 inline font-medium">{v}</dd>
    </div>
  )
}
