"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Search,
  ArrowLeft,
  MapPin,
  Link2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Project {
  id: string
  name: string
  friendlyName?: string
  municipalities: string[]
  sector: string
  stage: string
  type?: string
  cost?: number
  developer?: string
  website?: string
  isNew?: boolean
  isUpdated?: boolean
  pending?: boolean
  changeNote?: string
}

interface LinkedArticle {
  slug: string
  title: string
}

interface ArticleOption {
  slug: string
  title: string
  tags: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOURISM_SECTOR = "Tourism / Recreation"

function fmtCost(cost?: number): string {
  if (!cost) return "—"
  return cost >= 1000 ? `$${(cost / 1000).toFixed(1)}B` : `$${Math.round(cost)}M`
}

const STAGE_COLORS: Record<string, string> = {
  "Proposed": "bg-amber-100 text-amber-800",
  "Under Construction": "bg-blue-100 text-blue-800",
  "Completed": "bg-emerald-100 text-emerald-800",
}

// NEW / UPDATED pill shown on projects flagged by the latest sync. The
// changeNote (e.g. "Stage: Proposed → Under Construction") is surfaced on hover.
function PendingBadge({ project }: { project: Project }) {
  if (!project.pending && !project.isNew && !project.isUpdated) return null
  const isNew = project.isNew
  return (
    <span
      title={project.changeNote || (isNew ? "New project" : "Updated")}
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
        isNew ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isNew ? "New" : "Updated"}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Copy tag button
// ---------------------------------------------------------------------------
function CopyTagButton({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)
  const tag = `project:${projectId}`
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(tag).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        })
      }}
      title={`Copy tag: ${tag}`}
      className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : tag}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Link Article inline widget
// ---------------------------------------------------------------------------
function LinkArticleWidget({
  project,
  allArticles,
  onLinked,
}: {
  project: Project
  allArticles: ArticleOption[]
  onLinked: (slug: string, projectId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [linking, setLinking] = useState<string | null>(null)
  const [linked, setLinked] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    if (!q.trim()) return []
    const lq = q.toLowerCase()
    return allArticles
      .filter(a => a.title.toLowerCase().includes(lq) || a.slug.toLowerCase().includes(lq))
      .slice(0, 8)
  }, [q, allArticles])

  async function handleLink(article: ArticleOption) {
    setLinking(article.slug)
    try {
      const res = await fetch(`/api/admin/articles/${article.slug}/tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: `project:${project.id}` }),
      })
      if (res.ok) {
        setLinked(article.slug)
        onLinked(article.slug, project.id)
        setTimeout(() => {
          setOpen(false)
          setLinked(null)
          setQ("")
        }, 1500)
      }
    } catch {}
    setLinking(null)
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded font-medium transition-colors"
      >
        <Link2 className="w-3 h-3" />
        Link article
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-80 bg-white rounded-xl border border-gray-200 shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Search existing articles</p>
            <button onClick={() => { setOpen(false); setQ("") }} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Type article title…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-gray-50"
            />
          </div>
          {q.trim() && matches.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">No articles found</p>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {matches.map(a => (
              <button
                key={a.slug}
                onClick={() => handleLink(a)}
                disabled={!!linking || !!linked}
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-teal-50 transition-colors flex items-start gap-2 disabled:opacity-60"
              >
                {linked === a.slug ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : linking === a.slug ? (
                  <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                ) : (
                  <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                )}
                <span className="line-clamp-2 text-gray-700 leading-tight">{a.title}</span>
              </button>
            ))}
          </div>
          {!q.trim() && (
            <p className="text-[11px] text-gray-400 text-center py-1">Start typing to search articles</p>
          )}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              Or add tag <code className="font-mono bg-gray-100 px-1 rounded">project:{project.id}</code> manually in the article editor
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminMajorProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [articlesByProject, setArticlesByProject] = useState<Record<string, LinkedArticle[]>>({})
  const [allArticles, setAllArticles] = useState<ArticleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  // Category/sector filter — defaults to Tourism (current editorial focus); "all" shows every category
  const [sectorFilter, setSectorFilter] = useState<string>(TOURISM_SECTOR)
  const [pendingCount, setPendingCount] = useState(0)
  const [marking, setMarking] = useState(false)

  // Auth check
  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated")
    if (auth !== "true") router.push("/admin/login")
  }, [router])

  // Fetch projects (via sync — all sectors, with new/updated flags) + articles
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // 1. Sync + fetch all tracked projects (all sectors)
        const syncRes = await fetch("/api/admin/major-projects/sync", { cache: "no-store" })
        if (!syncRes.ok) throw new Error(`Sync failed (${syncRes.status})`)
        const sync = await syncRes.json()
        const parsed: Project[] = Array.isArray(sync.projects) ? sync.projects : []
        setProjects(parsed)
        setPendingCount(sync?.counts?.pending ?? 0)

        // 2. Fetch linked articles for these projects (chunk tags to keep query sane)
        const projectTags = parsed.map((p) => `project:${p.id}`)
        const byProject: Record<string, LinkedArticle[]> = {}
        for (let i = 0; i < projectTags.length; i += 300) {
          const chunk = projectTags.slice(i, i + 300)
          const artRes = await fetch("/api/admin/major-projects/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: chunk }),
          })
          if (artRes.ok) {
            const artData: ArticleOption[] = await artRes.json()
            for (const a of artData) {
              for (const tag of a.tags ?? []) {
                if (tag.startsWith("project:")) {
                  const id = tag.slice("project:".length)
                  if (!byProject[id]) byProject[id] = []
                  byProject[id].push({ slug: a.slug, title: a.title })
                }
              }
            }
          }
        }
        setArticlesByProject(byProject)

        // 3. Fetch all articles for the "Link Article" widget
        const allArtRes = await fetch("/api/admin/major-projects/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: [], fetchAll: true }),
        })
        if (allArtRes.ok) {
          setAllArticles(await allArtRes.json())
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Mark all new/updated projects as reviewed → clears the dashboard ping
  async function handleMarkAllReviewed() {
    setMarking(true)
    try {
      const res = await fetch("/api/admin/major-projects/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => ({ ...p, pending: false, isNew: false, isUpdated: false }))
        )
        setPendingCount(0)
      }
    } catch {
      // ignore
    } finally {
      setMarking(false)
    }
  }

  // When an article is linked via the widget, update local state immediately
  function handleArticleLinked(articleSlug: string, projectId: string) {
    const article = allArticles.find(a => a.slug === articleSlug)
    if (!article) return
    setArticlesByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] ?? []), { slug: article.slug, title: article.title }],
    }))
  }

  // Split projects into two lists: covered and needs-article
  const { coveredProjects, needsProjects } = useMemo(() => {
    const q = search.toLowerCase().trim()
    const stageOrder: Record<string, number> = { "Under Construction": 0, "Proposed": 1, "Completed": 2 }

    const base = projects.filter((p) => {
      if (sectorFilter !== "all" && p.sector !== sectorFilter) return false
      if (stageFilter && p.stage !== stageFilter) return false
      if (q) {
        const hay = [p.name, p.friendlyName ?? "", ...(p.municipalities ?? [])].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const covered = base
      .filter(p => !!(articlesByProject[p.id]?.length))
      .sort((a, b) => {
        const so = (stageOrder[a.stage] ?? 3) - (stageOrder[b.stage] ?? 3)
        return so !== 0 ? so : (b.cost ?? 0) - (a.cost ?? 0)
      })

    const needs = base
      .filter(p => !(articlesByProject[p.id]?.length))
      .sort((a, b) => {
        const so = (stageOrder[a.stage] ?? 3) - (stageOrder[b.stage] ?? 3)
        return so !== 0 ? so : (b.cost ?? 0) - (a.cost ?? 0)
      })

    return { coveredProjects: covered, needsProjects: needs }
  }, [projects, articlesByProject, sectorFilter, stageFilter, search])

  // Sectors present in the data, with project counts — drives the category chips.
  // Ordered by count desc so the biggest categories surface first.
  const sectors = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      const s = p.sector || "Other"
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
  }, [projects])

  const stats = useMemo(() => {
    const inScope = sectorFilter === "all" ? projects : projects.filter((p) => p.sector === sectorFilter)
    return {
      total: inScope.length,
      linked: inScope.filter((p) => !!(articlesByProject[p.id]?.length)).length,
      needs: inScope.filter((p) => !(articlesByProject[p.id]?.length)).length,
      ucNeeds: inScope.filter((p) => p.stage === "Under Construction" && !(articlesByProject[p.id]?.length)).length,
    }
  }, [projects, articlesByProject, sectorFilter])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Major Projects — Article Tracker
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">All sectors from the Alberta Major Projects Inventory — filter by category below</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={handleMarkAllReviewed}
                disabled={marking}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {marking ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Mark all reviewed ({pendingCount})
              </button>
            )}
            <Link
              href="/tools/alberta-major-projects"
              target="_blank"
              className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
            >
              View public tool <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Category / sector filter — Tourism is the current editorial focus, but
            every sector is browsable so future article beats can be planned. */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</span>
            <span className="text-xs text-gray-400">— pick a sector to plan article coverage</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSectorFilter("all")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                sectorFilter === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
              }`}
            >
              All categories ({projects.length})
            </button>
            {sectors.map(({ sector, count }) => (
              <button
                key={sector}
                onClick={() => setSectorFilter(sector)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  sectorFilter === sector
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                }`}
              >
                {sector} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-3 mb-6 text-sm">
          <span className="text-gray-500">{stats.total} total projects</span>
          <span className="text-gray-200">|</span>
          <span className="font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {stats.linked} covered
          </span>
          <span className="text-gray-200">|</span>
          <span className="font-semibold text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {stats.needs} need article
          </span>
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 w-44"
              />
            </div>
            {/* Stage filter */}
            {["Under Construction", "Proposed", "Completed"].map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(stageFilter === s ? null : s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  stageFilter === s ? STAGE_COLORS[s] + " border-current" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                }`}
              >
                {s === "Under Construction" ? "Building" : s}
              </button>
            ))}
          </div>
        </div>

        {/* ── SECTION 1: Covered projects ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-gray-900">Covered — {coveredProjects.length} project{coveredProjects.length !== 1 ? "s" : ""} with articles</h2>
          </div>

          {coveredProjects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-gray-400 text-sm">
              No covered projects yet. Use &quot;Link article&quot; or add a <code className="font-mono text-xs bg-gray-100 px-1 rounded">project:ID</code> tag to an article.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-emerald-50/60 text-left">
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Article</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {coveredProjects.map((p) => {
                      const articles = articlesByProject[p.id] ?? []
                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-semibold text-gray-900 leading-tight flex items-center gap-1.5">
                              {p.friendlyName || p.name}
                              <PendingBadge project={p} />
                            </div>
                            {p.type && <div className="text-xs text-gray-400 mt-0.5">{p.type}</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3 shrink-0" />{p.municipalities.join(", ") || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage] ?? "bg-gray-100 text-gray-600"}`}>
                              {p.stage === "Under Construction" ? "Building" : p.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-700">{fmtCost(p.cost)}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {articles.map((a) => (
                                <a key={a.slug} href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="line-clamp-1">{a.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3"><CopyTagButton projectId={p.id} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: Needs article ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-gray-900">Needs Article — {needsProjects.length} project{needsProjects.length !== 1 ? "s" : ""}</h2>
            {stats.ucNeeds > 0 && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {stats.ucNeeds} currently building — highest priority
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-rose-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-rose-50/40 text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {needsProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-gray-900 leading-tight flex items-center gap-1.5">
                          {p.friendlyName || p.name}
                          <PendingBadge project={p} />
                        </div>
                        {p.type && <div className="text-xs text-gray-400 mt-0.5">{p.type}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 shrink-0" />{p.municipalities.join(", ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.stage === "Under Construction" ? "Building" : p.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-700">{fmtCost(p.cost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CopyTagButton projectId={p.id} />
                          {allArticles.length > 0 && (
                            <LinkArticleWidget project={p} allArticles={allArticles} onLinked={handleArticleLinked} />
                          )}
                          <a href="/admin/articles/new" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded font-medium transition-colors">
                            <FileText className="w-3 h-3" /> Write
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {needsProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-200 mb-3" />
                  <p className="text-gray-500 font-semibold">All projects are covered!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Data from the <a href="https://majorprojects.alberta.ca" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600">Government of Alberta Major Projects Inventory</a>.
          To link an article, use the &quot;Link article&quot; button or add a <code className="font-mono">project:ID</code> tag in the article editor.
        </p>
      </div>
    </div>
  )
}
