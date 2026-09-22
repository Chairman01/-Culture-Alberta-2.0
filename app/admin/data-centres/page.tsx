"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Save, Plus, Link2, Check, Trash2 } from "lucide-react"
import { STATUS_LABEL, POWER_LABEL, WORKLOAD_LABEL, type DcStatus, type DcPower, type DcWorkload } from "@/lib/data/alberta-data-centres"
import type { TrackedDataCentre } from "@/lib/data-centres"

// Editor console for the public tracker at /tools/alberta-data-centres.
// Three jobs: correct a record, log what changed, attach our coverage.

type AdminItem = TrackedDataCentre & {
  override: { patch: Record<string, unknown>; note: string | null; verified_on: string | null; updated_at: string } | null
}
interface ArticleOption { slug: string; title: string; tags: string[] }

const TAG = (id: string) => `datacentre:${id}`
const today = () => new Date().toISOString().slice(0, 10)

export default function AdminDataCentresPage() {
  const [items, setItems] = useState<AdminItem[]>([])
  const [articles, setArticles] = useState<ArticleOption[]>([])
  const [meta, setMeta] = useState<{ lastReviewed: string; inventoryFetchedAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [flash, setFlash] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [a, b] = await Promise.all([
      fetch("/api/admin/data-centres").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/major-projects/articles", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: [], fetchAll: true }),
      }).then(r => r.ok ? r.json() : []),
    ])
    if (a) { setItems(a.items); setMeta({ lastReviewed: a.lastReviewed, inventoryFetchedAt: a.inventoryFetchedAt }) }
    setArticles(b)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? items.filter(i => `${i.name} ${i.operator} ${i.municipality}`.toLowerCase().includes(q)) : items
  }, [items, filter])

  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 2500) }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Centre Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">
              {items.length} records · base list reviewed {meta?.lastReviewed ?? "…"}
              {meta?.inventoryFetchedAt ? ` · provincial inventory checked ${meta.inventoryFetchedAt.slice(0, 10)}` : ""} ·{" "}
              <a href="/tools/alberta-data-centres" target="_blank" className="text-blue-700 hover:underline">view public page</a>
            </p>
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name, company, municipality" className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-72" />
        </div>

        {flash && <div className="mt-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">{flash}</div>}

        {loading ? <p className="mt-8 text-gray-500">Loading…</p> : (
          <div className="mt-6 space-y-2">
            {visible.map(dc => (
              <div key={dc.id} className="bg-white rounded-xl border border-gray-200">
                <button onClick={() => setOpenId(openId === dc.id ? null : dc.id)} className="w-full text-left px-4 py-3 flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${dc.override ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"}`}>{dc.override ? "edited" : "code"}</span>
                  <span className="font-semibold text-gray-900 flex-1">{dc.name}</span>
                  <span className="text-xs text-gray-500 hidden md:inline">{dc.municipality}</span>
                  <span className="text-xs text-gray-500 w-28">{STATUS_LABEL[dc.status]}</span>
                  <span className="text-xs text-gray-500 w-20 text-right">{dc.demandMW ?? "—"} MW</span>
                  <span className="text-xs text-gray-400 w-24 text-right">{dc.articles.length} stories</span>
                  {dc.inventory && dc.inventory.stage.toLowerCase() !== STATUS_LABEL[dc.status].toLowerCase() && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700" title={`Province says ${dc.inventory.stage}`}>province differs</span>
                  )}
                </button>
                {openId === dc.id && (
                  <Editor dc={dc} articles={articles} onSaved={m => { say(m); load() }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Editor({ dc, articles, onSaved }: { dc: AdminItem; articles: ArticleOption[]; onSaved: (m: string) => void }) {
  const patch0 = dc.override?.patch ?? {}
  const [status, setStatus] = useState<string>((patch0.status as string) ?? "")
  const [demandMW, setDemandMW] = useState<string>(patch0.demandMW != null ? String(patch0.demandMW) : "")
  const [power, setPower] = useState<string>((patch0.power as string) ?? "")
  const [workload, setWorkload] = useState<string>((patch0.workload as string) ?? "")
  const [costM, setCostM] = useState<string>(patch0.costM != null ? String(patch0.costM) : "")
  const [timeline, setTimeline] = useState<string>((patch0.timeline as string) ?? "")
  const [summary, setSummary] = useState<string>((patch0.summary as string) ?? "")
  const [note, setNote] = useState<string>(dc.override?.note ?? "")
  const [verifiedOn, setVerifiedOn] = useState<string>(dc.override?.verified_on ?? today())
  const [saving, setSaving] = useState(false)

  const [headline, setHeadline] = useState("")
  const [detail, setDetail] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [articleSlug, setArticleSlug] = useState("")
  const [happenedOn, setHappenedOn] = useState(today())

  const [search, setSearch] = useState("")
  const [linking, setLinking] = useState<string | null>(null)
  const linkedSlugs = new Set(dc.articles.map(a => a.slug))
  const matches = search.trim().length > 1
    ? articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) && !linkedSlugs.has(a.slug)).slice(0, 8)
    : []

  async function save() {
    setSaving(true)
    const patch: Record<string, unknown> = {}
    if (status) patch.status = status
    if (demandMW) patch.demandMW = Number(demandMW)
    if (power) patch.power = power
    if (workload) patch.workload = workload
    if (costM) patch.costM = Number(costM)
    if (timeline) patch.timeline = timeline
    if (summary) patch.summary = summary
    const res = await fetch("/api/admin/data-centres", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dc.id, patch, note, verifiedOn }),
    })
    setSaving(false)
    onSaved(res.ok ? "Saved. Public page re-rendered and pinged to search engines." : "Save failed.")
  }

  async function logUpdate() {
    if (!headline.trim()) return
    const res = await fetch("/api/admin/data-centres/updates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dcId: dc.id, headline, detail, sourceUrl, articleSlug, happenedOn }),
    })
    if (res.ok) { setHeadline(""); setDetail(""); setSourceUrl(""); setArticleSlug("") }
    onSaved(res.ok ? "Change logged." : "Could not log the change.")
  }

  async function removeUpdate(id: number) {
    const res = await fetch("/api/admin/data-centres/updates", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    })
    onSaved(res.ok ? "Entry removed." : "Could not remove the entry.")
  }

  async function link(slug: string) {
    setLinking(slug)
    const res = await fetch(`/api/admin/articles/${slug}/tag`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag: TAG(dc.id) }),
    })
    setLinking(null)
    setSearch("")
    onSaved(res.ok ? "Article linked." : "Could not link the article.")
  }

  const field = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
  const label = "text-xs font-semibold text-gray-500 uppercase tracking-wide"

  return (
    <div className="border-t border-gray-100 px-4 py-5 grid lg:grid-cols-[1.2fr_1fr] gap-8">
      {/* Record */}
      <div className="space-y-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong className="text-gray-700">In code:</strong> {STATUS_LABEL[dc.status]} · {dc.demandMW ?? "—"} MW · {POWER_LABEL[dc.power]} · {WORKLOAD_LABEL[dc.workload]}</p>
          {dc.inventory && <p><strong className="text-gray-700">Province:</strong> {dc.inventory.stage} · {dc.inventory.costM ? `$${dc.inventory.costM}M` : "no cost"} · {[dc.inventory.schedule, dc.inventory.scheduleEnd].filter(Boolean).join("–") || "no schedule"} · <a href={dc.inventory.url} target="_blank" className="text-blue-700 hover:underline inline-flex items-center gap-0.5">record <ExternalLink className="w-3 h-3" /></a></p>}
          <p>Leave a field blank to keep the value in code. Anything you enter overrides it on the public page.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><p className={label}>Status</p>
            <select value={status} onChange={e => setStatus(e.target.value)} className={field}>
              <option value="">(code: {STATUS_LABEL[dc.status]})</option>
              {(Object.keys(STATUS_LABEL) as DcStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select></div>
          <div><p className={label}>Demand (MW)</p><input value={demandMW} onChange={e => setDemandMW(e.target.value)} placeholder={String(dc.demandMW ?? "")} className={field} inputMode="decimal" /></div>
          <div><p className={label}>Cost ($M)</p><input value={costM} onChange={e => setCostM(e.target.value)} placeholder={String(dc.costM ?? "")} className={field} inputMode="decimal" /></div>
          <div><p className={label}>Power</p>
            <select value={power} onChange={e => setPower(e.target.value)} className={field}>
              <option value="">(code: {POWER_LABEL[dc.power]})</option>
              {(Object.keys(POWER_LABEL) as DcPower[]).map(s => <option key={s} value={s}>{POWER_LABEL[s]}</option>)}
            </select></div>
          <div><p className={label}>Workload</p>
            <select value={workload} onChange={e => setWorkload(e.target.value)} className={field}>
              <option value="">(code: {WORKLOAD_LABEL[dc.workload]})</option>
              {(Object.keys(WORKLOAD_LABEL) as DcWorkload[]).map(s => <option key={s} value={s}>{WORKLOAD_LABEL[s]}</option>)}
            </select></div>
          <div><p className={label}>Verified on</p><input type="date" value={verifiedOn} onChange={e => setVerifiedOn(e.target.value)} className={field} /></div>
        </div>
        <div><p className={label}>Timeline</p><textarea value={timeline} onChange={e => setTimeline(e.target.value)} placeholder={dc.timeline} rows={2} className={field} /></div>
        <div><p className={label}>Summary</p><textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder={dc.summary} rows={3} className={field} /></div>
        <div><p className={label}>Internal note (not published)</p><input value={note} onChange={e => setNote(e.target.value)} className={field} /></div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save record"}</button>
      </div>

      {/* Log + coverage */}
      <div className="space-y-6">
        <div>
          <p className={label}>Log a change</p>
          <div className="mt-2 space-y-2">
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline, e.g. AUC approved the 930 MW gas plant" className={field} />
            <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="Detail (optional)" rows={2} className={field} />
            <div className="grid grid-cols-2 gap-2">
              <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Source URL" className={field} />
              <input type="date" value={happenedOn} onChange={e => setHappenedOn(e.target.value)} className={field} />
            </div>
            <select value={articleSlug} onChange={e => setArticleSlug(e.target.value)} className={field}>
              <option value="">Link our story (optional)</option>
              {dc.articles.map(a => <option key={a.slug} value={a.slug}>{a.title}</option>)}
            </select>
            <button onClick={logUpdate} disabled={!headline.trim()} className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"><Plus className="w-4 h-4" /> Add to change log</button>
          </div>
          {dc.updates.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {dc.updates.map(u => (
                <li key={u.id} className="flex items-start gap-2">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${u.kind === "inventory" ? "bg-emerald-500" : "bg-blue-600"}`} />
                  <span className="flex-1"><span className="text-gray-400">{u.happenedOn}</span> {u.headline}</span>
                  <button onClick={() => removeUpdate(u.id)} className="text-gray-300 hover:text-rose-600" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className={label}>Our coverage</p>
          <ul className="mt-2 space-y-1 text-sm">
            {dc.articles.map(a => (
              <li key={a.slug} className="flex items-center gap-2 text-gray-800"><Check className="w-3.5 h-3.5 text-emerald-600" /><a href={`/articles/${a.slug}`} target="_blank" className="hover:text-blue-700">{a.title}</a></li>
            ))}
            {dc.articles.length === 0 && <li className="text-gray-400">No stories linked yet.</li>}
          </ul>
          <div className="mt-2 relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search published articles to link…" className={field} />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto text-sm">
                {matches.map(a => (
                  <li key={a.slug}>
                    <button onClick={() => link(a.slug)} disabled={linking === a.slug} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="flex-1">{a.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Linking adds the tag <code>{TAG(dc.id)}</code> to the article. To unlink, remove that tag in the article editor.</p>
        </div>
      </div>
    </div>
  )
}
