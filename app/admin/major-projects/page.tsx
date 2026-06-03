"use client"

import { useEffect, useState, useMemo } from "react"
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
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types (mirrors the main tool)
// ---------------------------------------------------------------------------
interface Project {
  id: string
  name: string
  friendlyName?: string
  municipalities: string[]
  stage: string
  type?: string
  cost?: number
  developer?: string
  website?: string
}

interface LinkedArticle {
  slug: string
  title: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOURISM_SECTOR = "Tourism / Recreation"
const ALBERTA_API_URL = "https://majorprojects.alberta.ca/api/MajorProjects?years=1"

function normalizeStage(raw: string): string {
  if (!raw) return "Proposed"
  if (raw.startsWith("Under Construction")) return "Under Construction"
  if (raw.startsWith("Proposed")) return "Proposed"
  if (raw.startsWith("Completed")) return "Completed"
  if (raw.startsWith("Cancelled")) return "Cancelled"
  return raw
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProject(feature: any): Project | null {
  const p = feature?.properties
  if (!p) return null
  if (p.sector !== TOURISM_SECTOR) return null
  const stage = normalizeStage(p.StageWithSubStage ?? p.stage ?? "Proposed")
  if (stage === "Cancelled") return null
  return {
    id: String(p.id ?? feature.id ?? ""),
    name: p.name ?? "Unnamed Project",
    friendlyName: p.friendlyName && p.friendlyName !== p.name ? p.friendlyName.replace(/-/g, " ") : undefined,
    municipalities: Array.isArray(p.municipalities) ? p.municipalities : p.municipality ? [p.municipality] : [],
    stage,
    type: p.type ?? undefined,
    cost: typeof p.cost === "number" ? p.cost : p.cost ? parseFloat(p.cost) : undefined,
    developer: p.developer ?? undefined,
    website: p.website && p.website.startsWith("http") ? p.website : undefined,
  }
}

function fmtCost(cost?: number): string {
  if (!cost) return "—"
  return cost >= 1000 ? `$${(cost / 1000).toFixed(1)}B` : `$${Math.round(cost)}M`
}

const STAGE_COLORS: Record<string, string> = {
  "Proposed": "bg-amber-100 text-amber-800",
  "Under Construction": "bg-blue-100 text-blue-800",
  "Completed": "bg-emerald-100 text-emerald-800",
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
// Page
// ---------------------------------------------------------------------------
export default function AdminMajorProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [articlesByProject, setArticlesByProject] = useState<Record<string, LinkedArticle[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "linked" | "needs">("all")
  const [stageFilter, setStageFilter] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated")
    if (auth !== "true") router.push("/admin/login")
  }, [router])

  // Fetch projects + articles
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch projects from Alberta API
        const geoRes = await fetch(ALBERTA_API_URL, { cache: "no-store" })
        const geojson = await geoRes.json()
        const features = Array.isArray(geojson.features) ? geojson.features : Array.isArray(geojson) ? geojson : []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Project[] = (features as any[]).map((f) => parseProject(f)).filter((p): p is Project => p !== null)
        setProjects(parsed)

        // Fetch linked articles via our own API
        const projectTags = parsed.map((p) => `project:${p.id}`)
        const artRes = await fetch("/api/admin/major-projects/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: projectTags }),
        })
        if (artRes.ok) {
          const artData: Array<{ slug: string; title: string; tags: string[] }> = await artRes.json()
          const byProject: Record<string, LinkedArticle[]> = {}
          for (const a of artData) {
            for (const tag of a.tags ?? []) {
              if (tag.startsWith("project:")) {
                const id = tag.slice("project:".length)
                if (!byProject[id]) byProject[id] = []
                byProject[id].push({ slug: a.slug, title: a.title })
              }
            }
          }
          setArticlesByProject(byProject)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return projects.filter((p) => {
      if (stageFilter && p.stage !== stageFilter) return false
      if (filter === "linked" && !(articlesByProject[p.id]?.length)) return false
      if (filter === "needs" && !!(articlesByProject[p.id]?.length)) return false
      if (q) {
        const hay = [p.name, p.friendlyName ?? "", ...(p.municipalities ?? [])].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => {
      // Needs Article first, then by stage order, then cost
      const hasA = !!(articlesByProject[a.id]?.length)
      const hasB = !!(articlesByProject[b.id]?.length)
      if (hasA !== hasB) return hasA ? 1 : -1
      const stageOrder: Record<string, number> = { "Under Construction": 0, "Proposed": 1, "Completed": 2 }
      const so = (stageOrder[a.stage] ?? 3) - (stageOrder[b.stage] ?? 3)
      if (so !== 0) return so
      return (b.cost ?? 0) - (a.cost ?? 0)
    })
  }, [projects, articlesByProject, filter, stageFilter, search])

  const stats = useMemo(() => ({
    total: projects.length,
    linked: projects.filter((p) => !!(articlesByProject[p.id]?.length)).length,
    needs: projects.filter((p) => !(articlesByProject[p.id]?.length)).length,
  }), [projects, articlesByProject])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-red-600">Error: {error}</div>
    )
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
            <p className="text-sm text-gray-500 mt-0.5">Tourism &amp; Recreation projects from the Alberta Major Projects Inventory</p>
          </div>
          <Link
            href="/tools/alberta-major-projects"
            target="_blank"
            className="ml-auto text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
          >
            View public tool <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 mt-0.5">Total projects</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <div className="text-3xl font-black text-emerald-600">{stats.linked}</div>
            <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Articles linked
            </div>
          </div>
          <div className="bg-white rounded-xl border border-rose-200 p-4">
            <div className="text-3xl font-black text-rose-600">{stats.needs}</div>
            <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Need an article
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              placeholder="Search projects, cities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "needs", "linked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f
                    ? f === "needs"
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : f === "linked"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-900 text-white border-gray-900"
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                }`}
              >
                {f === "all" ? `All (${stats.total})` : f === "needs" ? `Needs Article (${stats.needs})` : `Linked (${stats.linked})`}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200" />

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

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Article Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => {
                  const articles = articlesByProject[p.id] ?? []
                  const hasArticle = articles.length > 0
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50/70 transition-colors ${!hasArticle ? "bg-rose-50/30" : ""}`}>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-gray-900 leading-tight">{p.friendlyName || p.name}</div>
                        {p.type && <div className="text-xs text-gray-400 mt-0.5">{p.type}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {p.municipalities.join(", ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.stage === "Under Construction" ? "Building" : p.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-700">
                        {fmtCost(p.cost)}
                      </td>
                      <td className="px-4 py-3">
                        {hasArticle ? (
                          <div className="space-y-1">
                            {articles.map((a) => (
                              <a
                                key={a.slug}
                                href={`/articles/${a.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="line-clamp-1">{a.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Needs article
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CopyTagButton projectId={p.id} />
                          {!hasArticle && (
                            <a
                              href="/admin/articles/new"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded font-medium transition-colors"
                            >
                              <FileText className="w-3 h-3" /> Write
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-gray-500 font-semibold">No projects match your filters</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Data from the <a href="https://majorprojects.alberta.ca" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600">Government of Alberta Major Projects Inventory</a>.
          To link an article, add the <code className="font-mono">project:ID</code> tag to the article in the CMS.
        </p>
      </div>
    </div>
  )
}
