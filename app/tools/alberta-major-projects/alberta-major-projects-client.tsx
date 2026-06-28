"use client"

import Link from "next/link"
import Image from "next/image"
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
  Users,
  TrendingUp,
  Landmark,
  Copy,
  Check,
  Sparkles,
  Bell,
  ChevronRight,
  LayoutGrid,
  BarChart2,
  List,
  PieChart,
  ArrowUpDown,
  ChevronDown,
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

// Start year as a number for sorting by when a project was announced/started.
// Returns 0 when no year is present so undated projects sink to the bottom.
function startYearNum(project: Project): number {
  const y = (project.schedule ?? "").match(/\b(19|20)\d{2}\b/)?.[0]
  return y ? parseInt(y, 10) : 0
}

type SortKey = "cost" | "newest" | "oldest"

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
    ideas.push(`${name} opens: a first look inside`)
    ideas.push(`How ${name} is already changing ${city}`)
  }

  if (isPublicFunder(project.developer) && project.cost && project.cost >= 50) {
    ideas.push(`Who is paying for ${name}, and is it worth it?`)
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

          {/* Article links */}
          {linkedArticles.length > 0 && (
            <div className="px-5 py-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Culture Alberta Coverage
              </p>
              <div className="space-y-3">
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
              </div>
            </div>
          )}


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

      {/* Article footer */}
      {firstArticle ? (
        <div className="mt-auto">
          <a
            href={`/articles/${firstArticle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex gap-3 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors group/article"
          >
            {firstArticle.image_url ? (
              <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                <Image
                  src={firstArticle.image_url}
                  alt={firstArticle.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}
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
      ) : null}
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
          {firstArticle.image_url ? (
            <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <Image
                src={firstArticle.image_url}
                alt={firstArticle.title}
                fill
                className="object-cover group-hover/article:scale-105 transition-transform duration-300"
                sizes="80px"
              />
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-1">Read on Culture Alberta</p>
            <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover/article:text-teal-700 transition-colors">
              {firstArticle.title}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1 group-hover/article:text-teal-400 transition-all" />
        </a>
      ) : null}
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
  linked,
  onSelect,
}: {
  cityName: string
  total: number
  cost: number
  byStage: Record<string, number>
  linked: number
  onSelect: () => void
}) {
  const uc = byStage["Under Construction"] ?? 0
  const proposed = byStage["Proposed"] ?? 0
  const completed = byStage["Completed"] ?? 0
  const unlinked = total - linked
  const coveragePct = total > 0 ? Math.round((linked / total) * 100) : 0

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
      <div className="flex h-1.5 rounded-full overflow-hidden mb-3">
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

      {/* Article coverage */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {linked > 0 ? (
            <span className="text-[11px] font-semibold text-teal-600">
              {linked} article{linked !== 1 ? "s" : ""}
            </span>
          ) : null}
          {unlinked > 0 ? (
            <span className="text-[11px] text-rose-500 font-medium">
              {linked > 0 ? "· " : ""}{unlinked} need{unlinked === 1 ? "s" : ""} article
            </span>
          ) : (
            <span className="text-[11px] text-teal-500 font-medium">✓ All covered</span>
          )}
        </div>
        {/* Coverage bar */}
        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full transition-all ${coveragePct === 100 ? "bg-teal-400" : coveragePct > 0 ? "bg-teal-300" : "bg-gray-200"}`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-teal-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        View projects <ChevronRight className="w-3 h-3" />
      </p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// DonutChart — SVG donut chart (no external deps)
// ---------------------------------------------------------------------------
function DonutChart({
  slices,
  size = 150,
  centerLabel,
}: {
  slices: { label: string; count: number; hex: string }[]
  size?: number
  centerLabel?: string
}) {
  const total = slices.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  const cx = size / 2, cy = size / 2
  const outerR = size * 0.43, innerR = size * 0.27

  function xy(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  let start = 0
  const paths = slices.map((s) => {
    const sweep = (s.count / total) * 360
    const end = start + sweep
    const large = sweep > 180 ? 1 : 0
    const s1 = xy(start, outerR), e1 = xy(end, outerR)
    const s2 = xy(end, innerR), e2 = xy(start, innerR)
    const d = `M${s1.x} ${s1.y} A${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y} L${s2.x} ${s2.y} A${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}Z`
    start = end
    return { d, hex: s.hex, label: s.label, count: s.count }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.hex} stroke="white" strokeWidth="1.5" opacity={0.9} />
      ))}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">{total}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{centerLabel ?? "total"}</text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Chart view — stage breakdown + investment by city + donut charts
// ---------------------------------------------------------------------------
function ProjectChartView({
  projects,
  articlesByProject,
  onCityClick,
}: {
  projects: Project[]
  articlesByProject: Record<string, Article[]>
  onCityClick: (city: string) => void
}) {
  const STAGE_HEX: Record<string, string> = {
    "Under Construction": "#3b82f6",
    "Proposed": "#fbbf24",
    "Completed": "#10b981",
    "Cancelled": "#9ca3af",
  }
  const CITY_PALETTE = ["#0d9488","#0891b2","#6366f1","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7"]

  const stageData = useMemo(() => {
    const stages = [
      { key: "Under Construction", label: "Building", color: "bg-blue-500", hex: "#3b82f6" },
      { key: "Proposed", label: "Proposed", color: "bg-amber-400", hex: "#fbbf24" },
      { key: "Completed", label: "Completed", color: "bg-emerald-500", hex: "#10b981" },
    ]
    const totalCost = projects.reduce((s, p) => s + (p.cost ?? 0), 0)
    return stages.map(({ key, label, color, hex }) => {
      const ps = projects.filter(p => p.stage === key)
      const cost = ps.reduce((s, p) => s + (p.cost ?? 0), 0)
      return {
        label, color, hex,
        count: ps.length,
        cost,
        linked: ps.filter(p => getArticlesForProject(p.id, articlesByProject).length > 0).length,
        pct: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }
    })
  }, [projects, articlesByProject])

  const cityData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of projects) {
      for (const city of p.municipalities ?? []) {
        map[city] = (map[city] ?? 0) + (p.cost ?? 0)
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([city, cost]) => ({ city, cost }))
  }, [projects])

  const cityCountData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of projects) {
      for (const city of p.municipalities ?? []) {
        map[city] = (map[city] ?? 0) + 1
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ city, count }))
  }, [projects])

  const linkedCount = projects.filter(p => getArticlesForProject(p.id, articlesByProject).length > 0).length

  const maxCityCost = Math.max(...cityData.map(c => c.cost), 1)

  return (
    <div className="pt-8 space-y-10">

      {/* ── Row 1: Two donut charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        {/* Donut: projects by stage */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-gray-800 mb-1 self-start">Projects by Stage</h3>
          <p className="text-xs text-gray-400 mb-4 self-start">{projects.length} total</p>
          <DonutChart
            slices={stageData.map(s => ({ label: s.label, count: s.count, hex: s.hex }))}
            centerLabel="projects"
          />
          <div className="mt-4 space-y-1.5 w-full">
            {stageData.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.hex }} />
                  <span className="text-xs text-gray-600">{s.label}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: projects by top city */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-gray-800 mb-1 self-start">Projects by City</h3>
          <p className="text-xs text-gray-400 mb-4 self-start">Top 8 cities</p>
          <DonutChart
            slices={cityCountData.map((c, i) => ({ label: c.city, count: c.count, hex: CITY_PALETTE[i % CITY_PALETTE.length] }))}
            centerLabel="projects"
          />
          <div className="mt-4 space-y-1.5 w-full">
            {cityCountData.slice(0, 6).map((c, i) => (
              <div key={c.city} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CITY_PALETTE[i % CITY_PALETTE.length] }} />
                  <span className="text-xs text-gray-600">{c.city}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: article coverage */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-gray-800 mb-1 self-start">Article Coverage</h3>
          <p className="text-xs text-gray-400 mb-4 self-start">{linkedCount} of {projects.length} covered</p>
          <DonutChart
            slices={[
              { label: "Has article", count: linkedCount, hex: "#0d9488" },
              { label: "Needs article", count: projects.length - linkedCount, hex: "#f3f4f6" },
            ]}
            centerLabel="projects"
          />
          <div className="mt-4 space-y-1.5 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                <span className="text-xs text-gray-600">Has article</span>
              </div>
              <span className="text-xs font-semibold text-teal-700">{linkedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />
                <span className="text-xs text-gray-600">Needs article</span>
              </div>
              <span className="text-xs font-semibold text-rose-500">{projects.length - linkedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Bar charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Stage breakdown bars */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-0.5">Investment by Stage</h2>
          <p className="text-xs text-gray-400 mb-5">Combined project investment across all stages.</p>
          <div className="space-y-5">
            {stageData.map(({ label, color, count, cost, linked, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <span className="text-xs text-gray-400">{count} projects</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{fmtCost(cost)}</span>
                </div>
                <div className="h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${color} rounded-lg transition-all duration-700 opacity-80`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                  {linked > 0 && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-600">
                      {linked} covered
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City investment bars */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-0.5">Investment by City</h2>
          <p className="text-xs text-gray-400 mb-5">Top cities by combined project value. Click to filter.</p>
          <div className="space-y-3">
            {cityData.map(({ city, cost }) => {
              const pct = (cost / maxCityCost) * 100
              return (
                <button
                  key={city}
                  onClick={() => onCityClick(city)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-teal-600 transition-colors">{city}</span>
                    <span className="text-xs font-bold text-gray-900">{fmtCost(cost)}</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-400 rounded-full transition-all duration-700 group-hover:bg-teal-500"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AlbertaMajorProjectsClient({
  projects,
  articlesByProject,
  lastFetched,
  liveUnavailable,
}: {
  projects: Project[]
  articlesByProject: Record<string, Article[]>
  lastFetched?: string
  liveUnavailable?: boolean
}) {
  const [search, setSearch] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [articleFilter, setArticleFilter] = useState<"all" | "has" | "needs">("all")
  const [updatedProjectIds, setUpdatedProjectIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"grid" | "chart" | "list">("grid")
  const [sortBy, setSortBy] = useState<SortKey>("cost")
  const [citySearch, setCitySearch] = useState("")
  const [citySortBy, setCitySortBy] = useState<"activity" | "cost" | "name">("activity")

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

  // ── Back navigation: close detail panel instead of leaving page ──
  useEffect(() => {
    const onPop = () => {
      if (selectedProject) {
        setSelectedProject(null)
        // Keep a state so the next back doesn't immediately leave
        window.history.pushState({ panel: false }, "")
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [selectedProject])

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project)
    // Push a history entry so browser back closes the panel
    window.history.pushState({ panel: true, projectId: project.id }, "")
    // Dismiss the "updated" badge once viewed
    if (updatedProjectIds.has(project.id)) {
      setUpdatedProjectIds(prev => {
        const next = new Set(prev)
        next.delete(project.id)
        return next
      })
    }
  }, [updatedProjectIds])

  const isCitiesView = selectedStage === "__cities__"

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length }
    for (const p of projects) counts[p.stage] = (counts[p.stage] ?? 0) + 1
    return counts
  }, [projects])

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
    const map: Record<string, { city: string; total: number; cost: number; byStage: Record<string, number>; linked: number }> = {}
    for (const p of projects) {
      for (const city of p.municipalities ?? []) {
        if (!map[city]) map[city] = { city, total: 0, cost: 0, byStage: {}, linked: 0 }
        map[city].total++
        map[city].cost += p.cost ?? 0
        map[city].byStage[p.stage] = (map[city].byStage[p.stage] ?? 0) + 1
        if (getArticlesForProject(p.id, articlesByProject).length > 0) map[city].linked++
      }
    }
    const q = citySearch.toLowerCase().trim()
    return Object.values(map)
      .filter(c => !q || c.city.toLowerCase().includes(q))
      .sort((a, b) => {
        if (citySortBy === "name") return a.city.localeCompare(b.city)
        if (citySortBy === "cost") return b.cost - a.cost
        // "activity" — most under construction first, then cost
        const aUC = a.byStage["Under Construction"] ?? 0
        const bUC = b.byStage["Under Construction"] ?? 0
        if (aUC !== bUC) return bUC - aUC
        return b.cost - a.cost
      })
  }, [projects, articlesByProject, citySearch, citySortBy])

  const spotlight = useMemo(
    () => projects.filter((p) => p.stage === "Under Construction" && (p.cost ?? 0) >= 50).slice(0, 3),
    [projects]
  )

  const filtered = useMemo(() => {
    if (isCitiesView) return []

    const spotlightIds = new Set(spotlight.map((p) => p.id))
    const q = search.toLowerCase().trim()

    return projects
      .filter((p) => {
        if (!selectedStage && !selectedCity && !q && articleFilter === "all" && spotlightIds.has(p.id)) return false
        if (selectedStage && selectedStage !== "__cities__" && p.stage !== selectedStage) return false
        if (selectedCity && !(p.municipalities ?? []).includes(selectedCity)) return false
        if (q) {
          const hay = [p.name, p.friendlyName ?? "", ...(p.municipalities ?? []), p.developer ?? ""]
            .join(" ").toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (articleFilter === "has") return getArticlesForProject(p.id, articlesByProject).length > 0
        if (articleFilter === "needs") return getArticlesForProject(p.id, articlesByProject).length === 0
        return true
      })
      .sort((a, b) => {
        if (sortBy === "newest" || sortBy === "oldest") {
          const ya = startYearNum(a)
          const yb = startYearNum(b)
          // Undated projects always sink to the bottom, regardless of direction
          if (!ya && !yb) return (b.cost ?? 0) - (a.cost ?? 0)
          if (!ya) return 1
          if (!yb) return -1
          if (ya !== yb) return sortBy === "newest" ? yb - ya : ya - yb
          // Same year — fall back to biggest budget first
          return (b.cost ?? 0) - (a.cost ?? 0)
        }
        return (b.cost ?? 0) - (a.cost ?? 0)
      })
  }, [projects, selectedStage, selectedCity, search, spotlight, isCitiesView, articleFilter, articlesByProject, sortBy])

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
    setArticleFilter("all")
  }, [])

  const hasFilters = !!search || (!!selectedStage && !isCitiesView) || !!selectedCity || articleFilter !== "all"
  const showSpotlight = !hasFilters && !isCitiesView && spotlight.length > 0

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
                Hotels, arenas, recreation centres, and event venues tracked from proposal to
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
              {lastFetched && (
                <p className="text-xs text-gray-400">
                  {liveUnavailable ? 'Last synced' : 'Updated'} {lastFetched}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {liveUnavailable && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Live updates from the Government of Alberta are temporarily unavailable, so
            we&rsquo;re showing the most recent synced data{lastFetched ? ` (${lastFetched})` : ''}.
            Map locations and exact timelines may be missing until the live feed is back.
          </div>
        </div>
      )}

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

            {/* Sort by announced date */}
            <div className="ml-auto relative shrink-0">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                title="Sort projects"
                className="appearance-none pl-8 pr-7 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="cost">Biggest budget</option>
                <option value="newest">Newest announced</option>
                <option value="oldest">Oldest announced</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-gray-50 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("chart")}
                title="Chart view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "chart" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <PieChart className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* City chips */}
          {topCities.length > 0 && !isCitiesView && (
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

        {/* ── View router ── */}
        {isCitiesView ? (
          /* ── Cities dashboard view ── */
          <div className="pt-8">
            <div className="flex items-center gap-3 mb-2">
              <BarChart2 className="w-5 h-5 text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">Projects by City</h2>
              <span className="text-sm text-gray-400">{cityStats.length} cities with active projects</span>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-8">
              Click any city to explore its projects. Investment figures are combined across all stages.
            </p>

            {/* ── City search + sort bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="Search cities…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                {citySearch && (
                  <button onClick={() => setCitySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shrink-0">
                {([["activity", "Most Active"], ["cost", "Highest Investment"], ["name", "A – Z"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setCitySortBy(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${citySortBy === val ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {cityStats.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No cities match &quot;{citySearch}&quot;</p>
                <button onClick={() => setCitySearch("")} className="mt-2 text-sm text-teal-500 hover:text-teal-700 font-medium">Clear search</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cityStats.map(({ city, total, cost, byStage, linked }) => (
                  <CityCard
                    key={city}
                    cityName={city}
                    total={total}
                    cost={cost}
                    byStage={byStage}
                    linked={linked}
                    onSelect={() => {
                      setSelectedStage(null)
                      setSelectedCity(city)
                      setViewMode("grid")
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : viewMode === "chart" ? (
          /* ── Chart view ── */
          <ProjectChartView
            projects={filtered.length > 0 ? filtered : projects}
            articlesByProject={articlesByProject}
            onCityClick={(city) => {
              setSelectedStage(null)
              setSelectedCity(city)
              setViewMode("grid")
            }}
          />
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

            {/* ── Results count + article filter ── */}
            <div className="flex items-center justify-between pt-4 pb-3 flex-wrap gap-2">
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setArticleFilter(articleFilter === "has" ? "all" : "has")}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      articleFilter === "has"
                        ? "bg-teal-600 text-white border-teal-600"
                        : "text-teal-600 border-teal-200 hover:bg-teal-50"
                    }`}
                  >
                    {stats.linked} with article
                  </button>
                  <button
                    onClick={() => setArticleFilter(articleFilter === "needs" ? "all" : "needs")}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      articleFilter === "needs"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "text-rose-500 border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    {projects.length - stats.linked} need article
                  </button>
                </div>
              )}
            </div>

            {/* ── Main grid / list ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-semibold mb-1">No projects match your filters</p>
                <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button onClick={clearFilters} className="text-sm text-teal-500 hover:text-teal-700 font-medium">
                  Clear all filters
                </button>
              </div>
            ) : viewMode === "list" ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Project</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">City</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Stage</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((project) => {
                      const cfg = STAGE_CONFIG[project.stage as StageKey]
                      const hasArticle = getArticlesForProject(project.id, articlesByProject).length > 0
                      return (
                        <tr
                          key={project.id}
                          onClick={() => handleSelectProject(project)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-1">
                              {project.friendlyName || project.name}
                            </p>
                            {hasArticle && (
                              <span className="text-[10px] text-teal-600 font-medium">✓ Has article</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 hidden sm:table-cell">
                            {(project.municipalities ?? []).slice(0, 2).join(", ")}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg?.badgeClass ?? "bg-gray-100 text-gray-600"}`}>
                              {project.stage === "Under Construction" ? "Building" : project.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                            {project.cost ? `$${project.cost >= 1000 ? `${(project.cost / 1000).toFixed(1)}B` : `${project.cost}M`}` : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
