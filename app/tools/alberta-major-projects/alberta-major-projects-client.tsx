"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Calendar,
  Search,
  ExternalLink,
  X,
  HardHat,
  CheckCircle2,
  FileText,
  Users,
  TrendingUp,
  Landmark,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Project = {
  id: string
  name: string
  friendlyName?: string
  municipalities: string[]
  schedule?: string
  scheduleEnd?: string
  sector: string
  type?: string
  cost?: number
  developer?: string
  contractor?: string
  architect?: string
  website?: string
  stage: string
  status?: string
}

export type Article = {
  slug: string
  title: string
  image_url?: string | null
  description?: string | null
  excerpt?: string | null
  tags?: string[] | null
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------
type StageKey = "Proposed" | "Under Construction" | "Completed" | "Cancelled"

const STAGE_CONFIG: Record<
  StageKey,
  {
    label: string
    description: string
    step: number
    badgeClass: string
    topBorder: string
    progressBg: string
    progressWidth: string
    accentText: string
    accentBg: string
    tabActive: string
  }
> = {
  Proposed: {
    label: "Proposed",
    description: "Planning & approvals in progress",
    step: 0,
    badgeClass: "bg-amber-100 text-amber-800",
    topBorder: "border-t-amber-400",
    progressBg: "bg-amber-400",
    progressWidth: "15%",
    accentText: "text-amber-600",
    accentBg: "bg-amber-50",
    tabActive: "bg-amber-100 text-amber-800 border-amber-200",
  },
  "Under Construction": {
    label: "Under Construction",
    description: "Currently being built",
    step: 1,
    badgeClass: "bg-blue-100 text-blue-800",
    topBorder: "border-t-blue-500",
    progressBg: "bg-blue-500",
    progressWidth: "55%",
    accentText: "text-blue-600",
    accentBg: "bg-blue-50",
    tabActive: "bg-blue-100 text-blue-800 border-blue-200",
  },
  Completed: {
    label: "Completed",
    description: "Construction finished",
    step: 2,
    badgeClass: "bg-emerald-100 text-emerald-800",
    topBorder: "border-t-emerald-500",
    progressBg: "bg-emerald-500",
    progressWidth: "100%",
    accentText: "text-emerald-600",
    accentBg: "bg-emerald-50",
    tabActive: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  Cancelled: {
    label: "Cancelled",
    description: "Project cancelled",
    step: -1,
    badgeClass: "bg-gray-100 text-gray-500",
    topBorder: "border-t-gray-300",
    progressBg: "bg-gray-300",
    progressWidth: "0%",
    accentText: "text-gray-500",
    accentBg: "bg-gray-50",
    tabActive: "bg-gray-100 text-gray-600 border-gray-200",
  },
}

const STAGE_STEPS: StageKey[] = ["Proposed", "Under Construction", "Completed"]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCost(cost?: number): string {
  if (!cost) return ""
  if (cost >= 1000) return `$${(cost / 1000).toFixed(cost >= 10000 ? 0 : 1)}B`
  return `$${Math.round(cost)}M`
}

function fmtYear(dateStr?: string): string {
  if (!dateStr) return ""
  const year = dateStr.match(/\b(20\d{2})\b/)?.[1]
  return year ?? ""
}

// Government / public funding detection
const PUBLIC_KEYWORDS = [
  "government of alberta",
  "city of",
  "town of",
  "county of",
  "municipality of",
  "municipal district",
  "municipal land corp",
  "regional municipality",
  "regional authority",
  "capital region",
  "improvement district",
  "alberta health services",
  "ahs",
  "alberta infrastructure",
  "alberta seniors",
  "parks canada",
  "parks alberta",
  "university of",
  "college",
  "school board",
  "school division",
  "public library",
  "alberta gaming",
  "alberta housing",
  "canada mortgage",
  "cmhc",
  "edmonton public",
  "calgary board",
  "cmlc",
]

function isPublicFunder(developer?: string): boolean {
  if (!developer) return false
  const lower = developer.toLowerCase()
  return PUBLIC_KEYWORDS.some((kw) => lower.includes(kw))
}

function getArticlesForProject(projectId: string, articlesByProject: Record<string, Article[]>): Article[] {
  return articlesByProject[projectId] ?? []
}

// ---------------------------------------------------------------------------
// Copy tag — admin utility, hidden until hover
// ---------------------------------------------------------------------------
function CopyTagButton({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)
  const tag = `project:${projectId}`

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(tag)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [tag])

  return (
    <button
      onClick={handleCopy}
      title={`Copy tag to link an article: ${tag}`}
      className="flex items-center gap-1 text-[10px] font-mono text-gray-300 hover:text-teal-600 bg-transparent hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded px-1.5 py-0.5 transition-all"
    >
      {copied ? (
        <><Check className="w-2.5 h-2.5 text-teal-500" /><span className="text-teal-500">Copied!</span></>
      ) : (
        <><Copy className="w-2.5 h-2.5" /><span>{tag}</span></>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Standard project card
// ---------------------------------------------------------------------------
function ProjectCard({ project, linkedArticles }: { project: Project; linkedArticles: Article[] }) {
  const stageCfg = STAGE_CONFIG[project.stage as StageKey] ?? STAGE_CONFIG.Proposed
  const costStr = fmtCost(project.cost)
  const endYear = fmtYear(project.scheduleEnd)
  const startYear = fmtYear(project.schedule)
  const cities = (project.municipalities ?? []).join(", ")
  const displayName = project.friendlyName || project.name
  const firstArticle = linkedArticles[0] ?? null
  const publicFunder = isPublicFunder(project.developer)

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${stageCfg.topBorder} overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}
    >
      {/* Stage badge + external link */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-0">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageCfg.badgeClass}`}>
          {stageCfg.label}
        </span>
        <div className="flex items-center gap-2">
          {/* Copy tag — only visible on card hover */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyTagButton projectId={project.id} />
          </span>
          {project.website && (
            <a
              href={project.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-300 hover:text-teal-500 transition-colors"
              aria-label="Official project website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Project name */}
      <div className="px-4 pt-2 pb-0">
        <h3 className={`font-bold text-gray-900 leading-tight text-[15px] line-clamp-3 group-hover:${stageCfg.accentText} transition-colors`}>
          {displayName}
        </h3>
        {project.type && (
          <p className="text-[11px] text-gray-400 mt-0.5">{project.type}</p>
        )}
      </div>

      {/* Hero stats row: cost + city + year */}
      <div className="px-4 pt-3 pb-1 flex items-center flex-wrap gap-x-3 gap-y-1">
        {costStr && (
          <span className={`text-2xl font-black ${stageCfg.accentText} leading-none`}>
            {costStr}
          </span>
        )}
        {cities && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs font-medium text-gray-600">{cities}</span>
          </div>
        )}
        {endYear && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {startYear && startYear !== endYear ? `${startYear}–${endYear}` : `Est. ${endYear}`}
            </span>
          </div>
        )}
      </div>

      {/* Progress fill bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stageCfg.progressBg}`}
            style={{ width: stageCfg.progressWidth }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400">{stageCfg.description}</p>
          <div className="flex gap-1 text-[9px] text-gray-300">
            {STAGE_STEPS.map((s, i) => {
              const cfg = STAGE_CONFIG[s]
              const isDone = cfg.step < (STAGE_CONFIG[project.stage as StageKey]?.step ?? -1)
              const isActive = s === project.stage
              return (
                <span key={s} className={isActive ? `font-semibold ${cfg.accentText}` : isDone ? "text-gray-300" : "text-gray-200"}>
                  {i > 0 && "›"} {s.split(" ")[0]}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Developer + funding */}
      {project.developer && (
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <Users className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-[11px] text-gray-400 truncate flex-1 min-w-0">{project.developer}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
            publicFunder
              ? "bg-violet-50 text-violet-600 border border-violet-100"
              : "bg-gray-50 text-gray-400 border border-gray-100"
          }`}>
            {publicFunder ? (
              <span className="flex items-center gap-0.5"><Landmark className="w-2.5 h-2.5" /> Public</span>
            ) : "Private"}
          </span>
        </div>
      )}

      {/* Linked article — the main value-add */}
      {firstArticle ? (
        <div className="mt-auto">
          <Link
            href={`/articles/${firstArticle.slug}`}
            className="flex gap-3 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors group/article"
          >
            {firstArticle.image_url && (
              <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                <Image
                  src={firstArticle.image_url}
                  alt={firstArticle.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-0.5">
                Read on Culture Alberta
              </p>
              <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-snug group-hover/article:text-teal-700 transition-colors">
                {firstArticle.title}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1 group-hover/article:text-teal-400 group-hover/article:translate-x-0.5 transition-all" />
          </Link>
        </div>
      ) : (
        <div className="mt-auto h-2" /> /* consistent card height when no article */
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Spotlight card — featured layout for biggest projects
// ---------------------------------------------------------------------------
function SpotlightCard({ project, linkedArticles }: { project: Project; linkedArticles: Article[] }) {
  const stageCfg = STAGE_CONFIG[project.stage as StageKey] ?? STAGE_CONFIG["Under Construction"]
  const costStr = fmtCost(project.cost)
  const endYear = fmtYear(project.scheduleEnd)
  const startYear = fmtYear(project.schedule)
  const cities = (project.municipalities ?? []).join(", ")
  const displayName = project.friendlyName || project.name
  const firstArticle = linkedArticles[0] ?? null
  const publicFunder = isPublicFunder(project.developer)

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${stageCfg.topBorder} overflow-hidden flex flex-col group hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="p-6 flex-1">
        {/* Stage + sparkle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spotlight project</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyTagButton projectId={project.id} />
            </span>
            {project.website && (
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-300 hover:text-teal-500 transition-colors"
                aria-label="Project website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Budget — the hero number */}
        {costStr && (
          <div className={`text-4xl font-black ${stageCfg.accentText} leading-none mb-2`}>
            {costStr}
          </div>
        )}

        {/* Name */}
        <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3">
          {displayName}
        </h3>

        {/* Type + city + year */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.type && (
            <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
              {project.type}
            </span>
          )}
          {cities && (
            <span className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">
              <MapPin className="w-3 h-3" />
              {cities}
            </span>
          )}
          {endYear && (
            <span className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
              <Calendar className="w-3 h-3" />
              {startYear && startYear !== endYear ? `${startYear}–${endYear}` : `Est. ${endYear}`}
            </span>
          )}
        </div>

        {/* Stage + progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${stageCfg.accentText}`}>{stageCfg.label}</span>
            <span className="text-[11px] text-gray-400">{stageCfg.description}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${stageCfg.progressBg} transition-all duration-700`}
              style={{ width: stageCfg.progressWidth }}
            />
          </div>
        </div>

        {/* Developer */}
        {project.developer && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="text-xs text-gray-500">{project.developer}</span>
            {publicFunder && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                <Landmark className="w-2.5 h-2.5" /> Public
              </span>
            )}
          </div>
        )}
      </div>

      {/* Article — prominent in spotlight */}
      {firstArticle ? (
        <Link
          href={`/articles/${firstArticle.slug}`}
          className={`flex gap-4 p-4 border-t border-gray-100 hover:${stageCfg.accentBg} transition-colors group/article`}
        >
          {firstArticle.image_url && (
            <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <Image
                src={firstArticle.image_url}
                alt={firstArticle.title}
                fill
                className="object-cover group-hover/article:scale-105 transition-transform duration-300"
                sizes="80px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-1">
              Read on Culture Alberta
            </p>
            <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover/article:text-teal-700 transition-colors">
              {firstArticle.title}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1 group-hover/article:text-teal-400 group-hover/article:translate-x-0.5 transition-all" />
        </Link>
      ) : (
        <div className={`px-6 py-3 border-t border-gray-100 ${stageCfg.accentBg}`}>
          <p className="text-xs text-gray-400 italic">No article linked yet — write one and tag it <code className="font-mono text-[10px]">project:{project.id}</code></p>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AlbertaMajorProjectsClient({
  projects,
  articlesByProject,
  lastFetched,
}: {
  projects: Project[]
  articlesByProject: Record<string, Article[]>
  lastFetched?: string
}) {
  const [search, setSearch] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"cost" | "city">("cost")

  // Stage counts for tabs
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length }
    for (const p of projects) counts[p.stage] = (counts[p.stage] ?? 0) + 1
    return counts
  }, [projects])

  // Top cities (for quick city filter)
  const topCities = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      for (const m of p.municipalities ?? []) {
        counts[m] = (counts[m] ?? 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([city]) => city)
  }, [projects])

  // Spotlight: top 3 Under Construction by cost (before filtering)
  const spotlight = useMemo(
    () =>
      projects
        .filter((p) => p.stage === "Under Construction" && (p.cost ?? 0) >= 50)
        .slice(0, 3),
    [projects]
  )

  // Filtered + sorted grid (excludes spotlight projects unless user filters)
  const filtered = useMemo(() => {
    const spotlightIds = new Set(spotlight.map((p) => p.id))
    const q = search.toLowerCase().trim()

    return projects
      .filter((p) => {
        // Exclude spotlight items from main grid (unless a filter is active)
        if (!selectedStage && !selectedCity && !q && spotlightIds.has(p.id)) return false
        if (selectedStage && p.stage !== selectedStage) return false
        if (selectedCity && !(p.municipalities ?? []).includes(selectedCity)) return false
        if (q) {
          const hay = [p.name, p.friendlyName ?? "", ...(p.municipalities ?? []), p.developer ?? ""]
            .join(" ")
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "city")
          return (a.municipalities?.[0] ?? "").localeCompare(b.municipalities?.[0] ?? "")
        return (b.cost ?? 0) - (a.cost ?? 0)
      })
  }, [projects, selectedStage, selectedCity, search, sortBy, spotlight])

  // Summary stats
  const stats = useMemo(() => ({
    totalCost: projects.reduce((s, p) => s + (p.cost ?? 0), 0),
    underConstruction: projects.filter((p) => p.stage === "Under Construction").length,
    proposed: projects.filter((p) => p.stage === "Proposed").length,
    completed: projects.filter((p) => p.stage === "Completed").length,
    linked: Object.values(articlesByProject).filter((a) => a.length > 0).length,
  }), [projects, articlesByProject])

  const clearFilters = useCallback(() => {
    setSearch("")
    setSelectedStage(null)
    setSelectedCity(null)
  }, [])

  const hasFilters = !!search || !!selectedStage || !!selectedCity
  const showSpotlight = !hasFilters && spotlight.length > 0

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-7xl py-10">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Alberta Tools
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            {/* Left: editorial headline */}
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">
                Alberta Major Projects · Tourism &amp; Recreation
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-3">
                <span className={`text-blue-600`}>{stats.underConstruction} major projects</span>{" "}
                are being built across Alberta right now
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                Hotels, arenas, recreation centres, and event venues — tracked from proposal to
                completion. Data from the Government of Alberta, updated daily.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                <div>
                  <span className="text-2xl font-black text-gray-900">{fmtCost(stats.totalCost)}</span>
                  <span className="text-xs text-gray-400 ml-1.5">total investment</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-gray-900">{stats.proposed}</span>
                  <span className="text-xs text-gray-400 ml-1.5">proposed</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-gray-900">{stats.completed}</span>
                  <span className="text-xs text-gray-400 ml-1.5">completed</span>
                </div>
              </div>
            </div>

            {/* Right: source attribution */}
            <div className="flex flex-col gap-2 shrink-0 lg:text-right">
              <div className="text-xs text-gray-400">
                Source:{" "}
                <a
                  href="https://majorprojects.alberta.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-teal-600"
                >
                  Alberta Major Projects Inventory
                </a>
              </div>
              {lastFetched && (
                <p className="text-xs text-gray-400">Updated {lastFetched}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky filters ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl py-3 space-y-2">
          {/* Row 1: search + stage tabs */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search projects, cities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent bg-gray-50 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Stage tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setSelectedStage(null)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  selectedStage === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All <span className="opacity-60 ml-0.5">{stageCounts.all}</span>
              </button>
              {STAGE_STEPS.map((s) => {
                const cfg = STAGE_CONFIG[s]
                const count = stageCounts[s] ?? 0
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedStage(selectedStage === s ? null : s)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                      selectedStage === s
                        ? cfg.tabActive
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {s === "Under Construction" ? "Building" : s}{" "}
                    <span className="opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Sort */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">Sort:</span>
              <button
                onClick={() => setSortBy("cost")}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${sortBy === "cost" ? "bg-teal-100 text-teal-700 font-medium" : "text-gray-500 hover:bg-gray-100"}`}
              >
                Budget
              </button>
              <button
                onClick={() => setSortBy("city")}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${sortBy === "city" ? "bg-teal-100 text-teal-700 font-medium" : "text-gray-500 hover:bg-gray-100"}`}
              >
                City
              </button>
            </div>
          </div>

          {/* Row 2: City chips */}
          {topCities.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 shrink-0">Near:</span>
              {topCities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCity === city
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-teal-300 hover:text-teal-600"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl pb-20">

        {/* ── Spotlight section ── */}
        {showSpotlight && (
          <section className="pt-8 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Biggest active projects
              </h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Under Construction</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {spotlight.map((project) => (
                <SpotlightCard
                  key={project.id}
                  project={project}
                  linkedArticles={getArticlesForProject(project.id, articlesByProject)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Results count ── */}
        <div className="flex items-center justify-between pt-4 pb-3">
          <p className="text-xs text-gray-400">
            {hasFilters
              ? `${filtered.length} of ${projects.length} projects`
              : showSpotlight
                ? `${filtered.length} more projects`
                : `${filtered.length} projects`}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-2 text-teal-500 hover:text-teal-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </p>
          {stats.linked > 0 && (
            <p className="text-xs text-teal-600 font-medium">
              {stats.linked} project{stats.linked !== 1 ? "s" : ""} linked to articles
            </p>
          )}
        </div>

        {/* ── Main grid ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-semibold mb-1">No projects match your filters</p>
            <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="text-sm text-teal-500 hover:text-teal-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                linkedArticles={getArticlesForProject(project.id, articlesByProject)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-7xl py-6">
          <p className="text-xs text-gray-400 text-center">
            Data sourced from the Government of Alberta&rsquo;s{" "}
            <a href="https://majorprojects.alberta.ca" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600">
              Major Projects Inventory
            </a>
            . Projects ≥ $5M. Updated daily. For informational purposes only.
          </p>
        </div>
      </div>
    </div>
  )
}
