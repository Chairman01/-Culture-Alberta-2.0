"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useState, useMemo, useCallback, useEffect } from "react"
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
  Bell,
  Lightbulb,
  ChevronRight,
  LayoutGrid,
  Map,
  BarChart2,
} from "lucide-react"

// Dynamically import the map so Leaflet only loads client-side (no SSR)
const MapViewDynamic = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-xl border border-gray-200 text-gray-400 text-sm">
      Loading map…
    </div>
  ),
})

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
  lat?: number
  lng?: number
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

const PUBLIC_KEYWORDS = [
  "government of alberta","city of","town of","county of","municipality of",
  "municipal district","municipal land corp","regional municipality","regional authority",
  "capital region","improvement district","alberta health services","ahs",
  "alberta infrastructure","alberta seniors","parks canada","parks alberta",
  "university of","college","school board","school division","public library",
  "alberta gaming","alberta housing","canada mortgage","cmhc",
  "edmonton public","calgary board","cmlc",
]

function isPublicFunder(developer?: string): boolean {
  if (!developer) return false
  const lower = developer.toLowerCase()
  return PUBLIC_KEYWORDS.some((kw) => lower.includes(kw))
}

function getArticlesForProject(projectId: string, articlesByProject: Record<string, Article[]>): Article[] {
  return articlesByProject[projectId] ?? []
}

function getStorySuggestions(project: Project): string[] {
  const s = project.stage
  const city = (project.municipalities ?? [])[0] ?? "Alberta"
  const name = project.friendlyName || project.name
  const cost = project.cost ? `$${Math.round(project.cost)}M` : ""
  const ideas: string[] = []

  if (s === "Under Construction") {
    ideas.push(`Construction progress: how ${name} is taking shape in ${city}`)
    if (project.scheduleEnd) ideas.push(`Is ${name} on track to open by ${fmtYear(project.scheduleEnd)}?`)
    if (project.cost && project.cost >= 100) ideas.push(`Inside the ${cost} bet on ${city}'s future`)
  } else if (s === "Proposed") {
    ideas.push(`What the proposed ${name} means for ${city} residents`)
    ideas.push(`Community reaction to ${city}'s ${cost ? cost + " " : ""}${project.type?.toLowerCase() ?? "project"}`)
  } else if (s === "Completed") {
    ideas.push(`${name} opens — a first look inside`)
    ideas.push(`How ${name} is already changing ${city}`)
  }

  if (isPublicFunder(project.developer) && project.cost && project.cost >= 50) {
    ideas.push(`Who is paying for ${name} — and is it worth it?`)
  }

  return ideas.slice(0, 2)
}

// ---------------------------------------------------------------------------
// Copy tag — admin utility
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
      title={`Copy tag: ${tag}`}
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
// Project detail panel — bottom sheet on mobile, right panel on desktop
// ---------------------------------------------------------------------------
function ProjectDetailPanel({
  project,
  linkedArticles,
  onClose,
}: {
  project: Project
  linkedArticles: Article[]
  onClose: () => void
}) {
  const stageCfg = STAGE_CONFIG[project.stage as StageKey] ?? STAGE_CONFIG.Proposed
  const costStr = fmtCost(project.cost)
  const endYear = fmtYear(project.scheduleEnd)
  const startYear = fmtYear(project.schedule)
  const cities = (project.municipalities ?? []).join(", ")
  const displayName = project.friendlyName || project.name
  const publicFunder = isPublicFunder(project.developer)
  const storySuggestions = linkedArticles.length === 0 ? getStorySuggestions(project) : []
  const firstArticle = linkedArticles[0] ?? null

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    // Prevent body scroll while open
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/*
        Mobile: slides up from bottom as a sheet (max 90vh)
        Desktop (sm+): right panel, full height
      */}
      <div className={`
        fixed z-50 bg-white overflow-y-auto
        /* mobile: bottom sheet */
        bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl
        /* desktop: right panel */
        sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-full sm:h-full sm:w-[480px] sm:rounded-none
        shadow-2xl flex flex-col
      `}>

        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ── Article Hero (if linked) ── */}
        {firstArticle && firstArticle.image_url && (
          <a
            href={`/articles/${firstArticle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative w-full shrink-0 group"
            style={{ aspectRatio: "16/9" }}
          >
            <Image
              src={firstArticle.image_url}
              alt={firstArticle.title}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 480px"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-[10px] font-bold text-teal-300 uppercase tracking-widest mb-1">
                Culture Alberta Coverage
              </p>
              <p className="text-white font-bold text-base leading-snug line-clamp-3">
                {firstArticle.title}
              </p>
              <p className="text-white/70 text-xs mt-1.5 flex items-center gap-1">
                Read full article <ArrowRight className="w-3 h-3" />
              </p>
            </div>
            {/* Close button top-right */}
            <button
              onClick={(e) => { e.preventDefault(); onClose() }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </a>
        )}

        {/* Close button when no image */}
        {(!firstArticle || !firstArticle.image_url) && (
          <div className={`flex items-center justify-between px-5 pt-4 pb-0 shrink-0`}>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageCfg.badgeClass}`}>
              {stageCfg.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Main scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Project identity */}
          <div className={`px-5 pt-5 pb-4 border-b border-gray-100 ${firstArticle?.image_url ? "" : `border-t-4 ${stageCfg.topBorder} mt-3`}`}>
            {firstArticle?.image_url && (
              <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${stageCfg.badgeClass} mb-2`}>
                {stageCfg.label}
              </span>
            )}
            {costStr && (
              <div className={`text-3xl font-black ${stageCfg.accentText} leading-none mb-1.5`}>
                {costStr}
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{displayName}</h2>
            {project.type && <p className="text-sm text-gray-400 mt-0.5">{project.type}</p>}
          </div>

          {/* Quick stats */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-gray-100">
            {cities && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{cities}
                </p>
              </div>
            )}
            {(startYear || endYear) && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Timeline</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {startYear && startYear !== endYear ? `${startYear}–${endYear}` : endYear ? `Est. ${endYear}` : startYear}
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${stageCfg.accentText}`}>{stageCfg.label}</span>
              <span className="text-xs text-gray-400">{stageCfg.description}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${stageCfg.progressBg}`} style={{ width: stageCfg.progressWidth }} />
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {STAGE_STEPS.map((s, i) => {
                const cfg = STAGE_CONFIG[s]
                const isDone = cfg.step < (STAGE_CONFIG[project.stage as StageKey]?.step ?? -1)
                const isActive = s === project.stage
                return (
                  <span key={s} className={`flex items-center gap-1 ${isActive ? `font-bold ${cfg.accentText}` : isDone ? "text-gray-300" : "text-gray-200"}`}>
                    {i > 0 && <ChevronRight className="w-3 h-3" />}
                    {s === "Under Construction" ? "Building" : s}
                    {isActive && <span className={`w-1.5 h-1.5 rounded-full ${cfg.progressBg} inline-block ml-0.5`} />}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Team */}
          {(project.developer || project.contractor || project.architect) && (
            <div className="px-5 py-4 border-b border-gray-100 space-y-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Project Team</p>
              {project.developer && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Developer</span>
                  <div className="flex items-start gap-1.5 flex-wrap flex-1 min-w-0">
                    <span className="text-sm text-gray-700 font-medium leading-snug">{project.developer}</span>
                    {publicFunder && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full shrink-0">
                        <Landmark className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                  </div>
                </div>
              )}
              {project.contractor && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Contractor</span>
                  <span className="text-sm text-gray-700 leading-snug">{project.contractor}</span>
                </div>
              )}
              {project.architect && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Architect</span>
                  <span className="text-sm text-gray-700 leading-snug">{project.architect}</span>
                </div>
              )}
            </div>
          )}

          {/* External link */}
          {project.website && (
            <div className="px-5 py-4 border-b border-gray-100">
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl ${stageCfg.accentBg} hover:shadow-sm transition-all group`}
              >
                <span className={`text-sm font-semibold ${stageCfg.accentText}`}>Official Project Website</span>
                <ExternalLink className={`w-4 h-4 ${stageCfg.accentText} shrink-0`} />
              </a>
            </div>
          )}

          {/* Article links (multiple) or no-article state */}
          <div className="px-5 py-5">
            {linkedArticles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Culture Alberta Coverage ({linkedArticles.length})
                </p>
                {linkedArticles.map((article) => (
                  <a
                    key={article.slug}
                    href={`/articles/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/40 transition-all group"
                  >
                    {article.image_url && (
                      <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <Image
                          src={article.image_url}
                          alt={article.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-teal-700 transition-colors">
                        {article.title}
                      </p>
                      <p className="text-[11px] text-teal-500 mt-1.5 flex items-center gap-0.5 font-medium">
                        Read on Culture Alberta <ArrowRight className="w-3 h-3" />
                      </p>
                    </div>
                  </a>
                ))}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mt-2">
                  <span className="text-[11px] text-gray-400">Link another article:</span>
                  <CopyTagButton projectId={project.id} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Story ideas */}
                {storySuggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Story ideas
                    </p>
                    {storySuggestions.map((idea, i) => (
                      <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-2">
                        <span className="text-amber-500 font-bold text-sm shrink-0">{i + 1}.</span>
                        <p className="text-sm text-amber-900 leading-snug">{idea}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 mb-1">No article yet</p>
                  <p className="text-xs text-gray-400 mb-4">Write about this project and tag it to link it here.</p>
                  <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2 mb-3">
                    <span className="text-xs font-mono text-gray-500">project:{project.id}</span>
                    <CopyTagButton projectId={project.id} />
                  </div>
                  <a
                    href="/admin/articles/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors w-full justify-center"
                  >
                    <FileText className="w-4 h-4" /> Write an article
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom padding for mobile home-bar */}
          <div className="h-6 sm:h-2" />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Standard project card
// ---------------------------------------------------------------------------
function ProjectCard({
  project,
  linkedArticles,
  isUpdated,
  onSelect,
}: {
  project: Project
  linkedArticles: Article[]
  isUpdated?: boolean
  onSelect: (p: Project) => void
}) {
  const stageCfg = STAGE_CONFIG[project.stage as StageKey] ?? STAGE_CONFIG.Proposed
  const costStr = fmtCost(project.cost)
  const endYear = fmtYear(project.scheduleEnd)
  const startYear = fmtYear(project.schedule)
  const cities = (project.municipalities ?? []).join(", ")
  const displayName = project.friendlyName || project.name
  const firstArticle = linkedArticles[0] ?? null

  return (
    <article
      onClick={() => onSelect(project)}
      className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${stageCfg.topBorder} overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
    >
      {/* Stage badge + updated indicator + copy tag */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageCfg.badgeClass}`}>
            {stageCfg.label}
          </span>
          {isUpdated && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full animate-pulse">
              <Bell className="w-2.5 h-2.5" /> Updated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
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

      {/* Stats: cost + city + year */}
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
            <span>{startYear && startYear !== endYear ? `${startYear}–${endYear}` : `Est. ${endYear}`}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
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
              const isActive = s === project.stage
              return (
                <span key={s} className={isActive ? `font-semibold ${cfg.accentText}` : "text-gray-200"}>
                  {i > 0 && "›"} {s.split(" ")[0]}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Developer */}
      {project.developer && (
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <Users className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-[11px] text-gray-400 truncate flex-1 min-w-0">{project.developer}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
            isPublicFunder(project.developer)
              ? "bg-violet-50 text-violet-600 border border-violet-100"
              : "bg-gray-50 text-gray-400 border border-gray-100"
          }`}>
            {isPublicFunder(project.developer) ? (
              <span className="flex items-center gap-0.5"><Landmark className="w-2.5 h-2.5" /> Public</span>
            ) : "Private"}
          </span>
        </div>
      )}

      {/* Article or "no article" footer */}
      {firstArticle ? (
        <div className="mt-auto">
          <a
            href={`/articles/${firstArticle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
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
          </a>
        </div>
      ) : (
        <div className="mt-auto px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 italic">No article — click to see story ideas</p>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Spotlight card
// ---------------------------------------------------------------------------
function SpotlightCard({
  project,
  linkedArticles,
  isUpdated,
  onSelect,
}: {
  project: Project
  linkedArticles: Article[]
  isUpdated?: boolean
  onSelect: (p: Project) => void
}) {
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
      onClick={() => onSelect(project)}
      className={`bg-white rounded-2xl border border-gray-100 border-t-4 ${stageCfg.topBorder} overflow-hidden flex flex-col group hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
    >
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spotlight project</span>
            {isUpdated && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                <Bell className="w-2.5 h-2.5" /> Updated
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <CopyTagButton projectId={project.id} />
            </span>
            {project.website && (
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-gray-300 hover:text-teal-500 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {costStr && (
          <div className={`text-4xl font-black ${stageCfg.accentText} leading-none mb-2`}>
            {costStr}
          </div>
        )}

        <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3">{displayName}</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {project.type && (
            <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
              {project.type}
            </span>
          )}
          {cities && (
            <span className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">
              <MapPin className="w-3 h-3" />{cities}
            </span>
          )}
          {endYear && (
            <span className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
              <Calendar className="w-3 h-3" />
              {startYear && startYear !== endYear ? `${startYear}–${endYear}` : `Est. ${endYear}`}
            </span>
          )}
        </div>

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

      {firstArticle ? (
        <a
          href={`/articles/${firstArticle.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
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
            <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-1">Read on Culture Alberta</p>
            <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover/article:text-teal-700 transition-colors">
              {firstArticle.title}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1 group-hover/article:text-teal-400 transition-all" />
        </a>
      ) : (
        <div className={`px-6 py-3 border-t border-gray-100 ${stageCfg.accentBg}`}>
          <p className="text-xs text-gray-400 italic">No article — click for story ideas</p>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// City card — used in the "By City" dashboard view
// ---------------------------------------------------------------------------
function CityCard({
  cityName,
  total,
  cost,
  byStage,
  onSelect,
}: {
  cityName: string
  total: number
  cost: number
  byStage: Record<string, number>
  onSelect: () => void
}) {
  const uc = byStage["Under Construction"] ?? 0
  const proposed = byStage["Proposed"] ?? 0
  const completed = byStage["Completed"] ?? 0

  return (
    <button
      onClick={onSelect}
      className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group w-full"
    >
      {/* City name + count */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-teal-700 transition-colors">
            {cityName}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} project{total !== 1 ? "s" : ""}
          </p>
        </div>
        <MapPin className="w-4 h-4 text-gray-200 shrink-0 group-hover:text-teal-400 transition-colors mt-0.5" />
      </div>

      {/* Total investment */}
      {cost > 0 && (
        <p className="text-2xl font-black text-gray-900 mb-3 leading-none">{fmtCost(cost)}</p>
      )}

      {/* Stage pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {uc > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            {uc} building
          </span>
        )}
        {proposed > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            {proposed} proposed
          </span>
        )}
        {completed > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {completed} done
          </span>
        )}
      </div>

      {/* Visual proportion bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden">
        {uc > 0 && (
          <div className="bg-blue-500 transition-all" style={{ flex: uc }} />
        )}
        {proposed > 0 && (
          <div className="bg-amber-400 transition-all" style={{ flex: proposed }} />
        )}
        {completed > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ flex: completed }} />
        )}
      </div>

      <p className="mt-2.5 text-[11px] text-teal-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        View projects <ChevronRight className="w-3 h-3" />
      </p>
    </button>
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [updatedProjectIds, setUpdatedProjectIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")

  // ── Detect changed projects using localStorage snapshot ──
  useEffect(() => {
    if (!projects.length) return
    try {
      const stored = localStorage.getItem("ca-project-snapshots")
      const snapshots: Record<string, string> = stored ? JSON.parse(stored) : {}
      const changed = new Set<string>()
      const fresh: Record<string, string> = {}

      for (const p of projects) {
        const sig = `${p.stage}|${p.cost ?? ""}|${p.schedule ?? ""}|${p.scheduleEnd ?? ""}`
        if (snapshots[p.id] && snapshots[p.id] !== sig) changed.add(p.id)
        fresh[p.id] = sig
      }

      setUpdatedProjectIds(changed)
      localStorage.setItem("ca-project-snapshots", JSON.stringify(fresh))
    } catch {}
  }, [projects])

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project)
    // Dismiss the "updated" badge once viewed
    if (updatedProjectIds.has(project.id)) {
      setUpdatedProjectIds(prev => {
        const next = new Set(prev)
        next.delete(project.id)
        return next
      })
    }
  }, [updatedProjectIds])

  const isQueueView = selectedStage === "__queue__"
  const isCitiesView = selectedStage === "__cities__"

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length }
    for (const p of projects) counts[p.stage] = (counts[p.stage] ?? 0) + 1
    return counts
  }, [projects])

  const queueCount = useMemo(
    () => projects.filter(p => !getArticlesForProject(p.id, articlesByProject).length).length,
    [projects, articlesByProject]
  )

  const topCities = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      for (const m of p.municipalities ?? []) {
        counts[m] = (counts[m] ?? 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([city]) => city)
  }, [projects])

  const cityStats = useMemo(() => {
    const map: Record<string, { city: string; total: number; cost: number; byStage: Record<string, number> }> = {}
    for (const p of projects) {
      for (const city of p.municipalities ?? []) {
        if (!map[city]) map[city] = { city, total: 0, cost: 0, byStage: {} }
        map[city].total++
        map[city].cost += p.cost ?? 0
        map[city].byStage[p.stage] = (map[city].byStage[p.stage] ?? 0) + 1
      }
    }
    return Object.values(map).sort((a, b) => {
      const aUC = a.byStage["Under Construction"] ?? 0
      const bUC = b.byStage["Under Construction"] ?? 0
      if (aUC !== bUC) return bUC - aUC
      return b.cost - a.cost
    })
  }, [projects])

  const spotlight = useMemo(
    () => projects.filter((p) => p.stage === "Under Construction" && (p.cost ?? 0) >= 50).slice(0, 3),
    [projects]
  )

  const filtered = useMemo(() => {
    if (isQueueView) {
      return projects
        .filter(p => !getArticlesForProject(p.id, articlesByProject).length)
        .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    }

    if (isCitiesView) return []

    const spotlightIds = new Set(spotlight.map((p) => p.id))
    const q = search.toLowerCase().trim()

    return projects
      .filter((p) => {
        if (!selectedStage && !selectedCity && !q && spotlightIds.has(p.id)) return false
        if (selectedStage && selectedStage !== "__queue__" && selectedStage !== "__cities__" && p.stage !== selectedStage) return false
        if (selectedCity && !(p.municipalities ?? []).includes(selectedCity)) return false
        if (q) {
          const hay = [p.name, p.friendlyName ?? "", ...(p.municipalities ?? []), p.developer ?? ""]
            .join(" ").toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "city") return (a.municipalities?.[0] ?? "").localeCompare(b.municipalities?.[0] ?? "")
        return (b.cost ?? 0) - (a.cost ?? 0)
      })
  }, [projects, selectedStage, selectedCity, search, sortBy, spotlight, articlesByProject, isQueueView, isCitiesView])

  const stats = useMemo(() => ({
    totalCost: projects.reduce((s, p) => s + (p.cost ?? 0), 0),
    underConstruction: projects.filter((p) => p.stage === "Under Construction").length,
    proposed: projects.filter((p) => p.stage === "Proposed").length,
    completed: projects.filter((p) => p.stage === "Completed").length,
    linked: projects.filter(p => getArticlesForProject(p.id, articlesByProject).length > 0).length,
  }), [projects, articlesByProject])

  const clearFilters = useCallback(() => {
    setSearch("")
    setSelectedStage(null)
    setSelectedCity(null)
  }, [])

  const hasFilters = !!search || (!!selectedStage && !isQueueView && !isCitiesView) || !!selectedCity
  const showSpotlight = !hasFilters && !isQueueView && !isCitiesView && spotlight.length > 0

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
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">
                Alberta Major Projects · Tourism &amp; Recreation
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-3">
                <span className="text-blue-600">{stats.underConstruction} major projects</span>{" "}
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
                <div>
                  <span className="text-2xl font-black text-teal-600">{stats.linked}</span>
                  <span className="text-xs text-gray-400 ml-1.5">covered</span>
                  {updatedProjectIds.size > 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                      {updatedProjectIds.size} updated
                    </span>
                  )}
                </div>
              </div>
            </div>

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
              {lastFetched && <p className="text-xs text-gray-400">Updated {lastFetched}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky filters ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl py-3 space-y-2">
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
                      selectedStage === s ? cfg.tabActive : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {s === "Under Construction" ? "Building" : s}{" "}
                    <span className="opacity-60">{count}</span>
                  </button>
                )
              })}

              {/* Content queue tab */}
              <button
                onClick={() => setSelectedStage(isQueueView ? null : "__queue__")}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border flex items-center gap-1 ${
                  isQueueView
                    ? "bg-rose-100 text-rose-700 border-rose-200"
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                }`}
              >
                <FileText className="w-3 h-3" />
                Needs Article
                <span className="opacity-70">{queueCount}</span>
              </button>

              {/* By City tab */}
              <button
                onClick={() => setSelectedStage(isCitiesView ? null : "__cities__")}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border flex items-center gap-1 ${
                  isCitiesView
                    ? "bg-teal-100 text-teal-700 border-teal-200"
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100"
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                By City
              </button>
            </div>

            {/* Sort + View toggle */}
            <div className="ml-auto flex items-center gap-3 shrink-0">
              {viewMode === "grid" && (
                <div className="flex items-center gap-1.5">
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
              )}

              {/* Map / Grid view toggle */}
              <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  title="Map view"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "map" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Map className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* City chips */}
          {topCities.length > 0 && !isQueueView && (
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

        {/* ── Content Queue view ── */}
        {isQueueView ? (
          <div className="pt-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-gray-900">Writing Queue</h2>
              <span className="text-sm text-gray-400">{queueCount} projects still need an article</span>
            </div>
            <p className="text-sm text-gray-400 mb-6 ml-8">
              Click any project for story ideas. Copy the tag, add it to your article in the admin, and it will appear on the project card.
            </p>

            <div className="space-y-2">
              {filtered.map((p) => {
                const cfg = STAGE_CONFIG[p.stage as StageKey] ?? STAGE_CONFIG.Proposed
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm hover:border-teal-100 transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        {fmtCost(p.cost) && (
                          <span className={`text-sm font-black ${cfg.accentText}`}>{fmtCost(p.cost)}</span>
                        )}
                        {(p.municipalities ?? []).length > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{(p.municipalities ?? []).join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">
                        {p.friendlyName || p.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <CopyTagButton projectId={p.id} />
                      <a
                        href="/admin/articles/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Write
                      </a>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-teal-400 transition-colors" />
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-semibold">All projects have articles!</p>
                  <p className="text-sm text-gray-400">Great coverage — every project on the tracker is linked to a Culture Alberta article.</p>
                </div>
              )}
            </div>
          </div>
        ) : isCitiesView ? (
          /* ── Cities dashboard view ── */
          <div className="pt-8">
            <div className="flex items-center gap-3 mb-2">
              <BarChart2 className="w-5 h-5 text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">Projects by City</h2>
              <span className="text-sm text-gray-400">{cityStats.length} cities with active projects</span>
            </div>
            <p className="text-sm text-gray-400 mb-6 ml-8">
              Click any city to explore its projects. Investment figures are combined across all stages.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cityStats.map(({ city, total, cost, byStage }) => (
                <CityCard
                  key={city}
                  cityName={city}
                  total={total}
                  cost={cost}
                  byStage={byStage}
                  onSelect={() => {
                    setSelectedStage(null)
                    setSelectedCity(city)
                    setViewMode("grid")
                  }}
                />
              ))}
            </div>
          </div>
        ) : viewMode === "map" ? (
          /* ── Map view ── */
          <div className="pt-6">
            <MapViewDynamic
              projects={filtered.length > 0 ? filtered : projects}
              articlesByProject={articlesByProject}
              onSelectProject={handleSelectProject}
              selectedProjectId={selectedProject?.id}
            />
          </div>
        ) : (
          <>
            {/* ── Spotlight section ── */}
            {showSpotlight && (
              <section className="pt-8 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Biggest active projects</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">Under Construction</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {spotlight.map((project) => (
                    <SpotlightCard
                      key={project.id}
                      project={project}
                      linkedArticles={getArticlesForProject(project.id, articlesByProject)}
                      isUpdated={updatedProjectIds.has(project.id)}
                      onSelect={handleSelectProject}
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
                  <button onClick={clearFilters} className="ml-2 text-teal-500 hover:text-teal-700 font-medium">
                    Clear filters
                  </button>
                )}
              </p>
              {stats.linked > 0 && (
                <p className="text-xs text-teal-600 font-medium">
                  {stats.linked} / {projects.length} linked to articles
                </p>
              )}
            </div>

            {/* ── Main grid ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-semibold mb-1">No projects match your filters</p>
                <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button onClick={clearFilters} className="text-sm text-teal-500 hover:text-teal-700 font-medium">
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
                    isUpdated={updatedProjectIds.has(project.id)}
                    onSelect={handleSelectProject}
                  />
                ))}
              </div>
            )}
          </>
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

      {/* ── Project detail panel ── */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          linkedArticles={getArticlesForProject(selectedProject.id, articlesByProject)}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  )
}
