import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import AlbertaMajorProjectsClient, { type Project, type Article } from "./alberta-major-projects-client"

// ---------------------------------------------------------------------------
// Metadata + SEO
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Alberta Tourism & Recreation Projects 2026 | Major Projects Tracker | Culture Alberta",
  description:
    "Track every major hotel, arena, recreation centre, and tourism development underway in Alberta. Stage-by-stage updates with related news. Data from the Government of Alberta's Major Projects Inventory.",
  keywords: [
    "Alberta major projects 2026",
    "Alberta construction projects",
    "Alberta tourism projects",
    "Alberta recreation projects",
    "Alberta hotel development",
    "Alberta arena construction",
    "Alberta recreation centre",
    "major projects Alberta tracker",
    "Alberta infrastructure projects",
    "Calgary construction projects",
    "Edmonton major projects",
    "Alberta development tracker",
    "Alberta government projects",
    "Alberta event centre construction",
    "Alberta tourism development 2026",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/alberta-major-projects",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    title: "Alberta Tourism & Recreation Projects 2026 | Culture Alberta",
    description:
      "Hotels, arenas, recreation centres, and event venues being built across Alberta right now. Track every project from proposal to completion.",
    url: "https://www.culturealberta.com/tools/alberta-major-projects",
    siteName: "Culture Alberta",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Alberta Tourism & Recreation Major Projects Tracker — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Tourism & Recreation Projects 2026",
    description:
      "Track every hotel, arena, and recreation project being built in Alberta. Stage-by-stage updates from the Government of Alberta's inventory.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------
const pageSchema = {
  "@context": "https://schema.org",
  "@type": "DataCatalog",
  name: "Alberta Tourism & Recreation Major Projects Tracker",
  description:
    "A curated tracker of major hotel, arena, recreation centre, and tourism development projects in Alberta, sourced from the Government of Alberta's Major Projects Inventory.",
  url: "https://www.culturealberta.com/tools/alberta-major-projects",
  publisher: {
    "@type": "Organization",
    name: "Culture Alberta",
    url: "https://www.culturealberta.com",
  },
  about: {
    "@type": "AdministrativeArea",
    name: "Alberta",
    containedInPlace: { "@type": "Country", name: "Canada" },
  },
  license: "https://open.alberta.ca/licence",
  isBasedOn: {
    "@type": "Dataset",
    name: "Alberta Major Projects Inventory",
    url: "https://majorprojects.alberta.ca",
    publisher: {
      "@type": "GovernmentOrganization",
      name: "Government of Alberta",
      url: "https://www.alberta.ca",
    },
  },
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Alberta Tools",
      item: "https://www.culturealberta.com/tools",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Alberta Major Projects",
      item: "https://www.culturealberta.com/tools/alberta-major-projects",
    },
  ],
}

// ---------------------------------------------------------------------------
// Alberta API helpers
// ---------------------------------------------------------------------------
const ALBERTA_API_URL =
  "https://majorprojects.alberta.ca/api/MajorProjects?years=1"

// The API uses "Tourism / Recreation" (spaces around slash)
const TOURISM_SECTOR = "Tourism / Recreation"

// Normalize sub-stage values: "Proposed-Design" → "Proposed", etc.
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

  // Only Tourism / Recreation
  if (p.sector !== TOURISM_SECTOR) return null

  // The correct stage field is StageWithSubStage (e.g. "Proposed-Design")
  // Fall back to `stage` if not present
  const rawStage: string = p.StageWithSubStage ?? p.stage ?? "Proposed"
  const stage = normalizeStage(rawStage)

  // Omit cancelled projects from the default view
  if (stage === "Cancelled") return null

  return {
    id: String(p.id ?? feature.id ?? Math.random()),
    name: p.name ?? "Unnamed Project",
    friendlyName:
      p.friendlyName && p.friendlyName !== p.name
        ? p.friendlyName.replace(/-/g, " ")
        : undefined,
    municipalities: Array.isArray(p.municipalities)
      ? p.municipalities
      : p.municipality
        ? [p.municipality]
        : [],
    schedule: p.schedule ?? undefined,
    scheduleEnd: p.scheduleEnd ?? undefined,
    sector: p.sector ?? "",
    type: p.type ?? undefined,
    cost: typeof p.cost === "number" ? p.cost : p.cost ? parseFloat(p.cost) : undefined,
    developer: p.developer ?? undefined,
    contractor: p.contractor ?? undefined,
    architect: p.architect ?? undefined,
    website: p.website && p.website.startsWith("http") ? p.website : undefined,
    stage,
    status: p.status ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Page (async server component)
// ---------------------------------------------------------------------------
export default async function AlbertaMajorProjectsPage() {
  // ------------------------------------------------------------------
  // 1. Fetch projects from Alberta API
  // ------------------------------------------------------------------
  let projects: Project[] = []
  let lastFetched: string | undefined

  try {
    const res = await fetch(ALBERTA_API_URL, {
      next: { revalidate: 86400 }, // refresh once per day
    })

    if (res.ok) {
      const geojson = await res.json()
      const features: unknown[] = Array.isArray(geojson.features)
        ? geojson.features
        : Array.isArray(geojson)
          ? geojson
          : []

      projects = features
        .map(parseProject)
        .filter((p): p is Project => p !== null)
        // Sort: Under Construction first, then Proposed, then Completed; within each, largest budget first
        .sort((a, b) => {
          const stageOrder: Record<string, number> = {
            "Under Construction": 0,
            Proposed: 1,
            Completed: 2,
          }
          const stageA = stageOrder[a.stage] ?? 3
          const stageB = stageOrder[b.stage] ?? 3
          if (stageA !== stageB) return stageA - stageB
          return (b.cost ?? 0) - (a.cost ?? 0)
        })

      lastFetched = new Date().toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  } catch {
    // API unreachable — silently show empty state
  }

  // ------------------------------------------------------------------
  // 2. Fetch linked articles from Supabase
  //    Convention: article tags include `project:{id}` to link to a project
  // ------------------------------------------------------------------
  let articlesByProject: Record<string, Article[]> = {}

  if (projects.length > 0) {
    const projectTags = projects.map((p) => `project:${p.id}`)

    try {
      const { data } = await supabase
        .from("articles")
        .select("slug, title, image_url, description, excerpt, tags")
        .eq("status", "published")
        .overlaps("tags", projectTags)
        .order("created_at", { ascending: false })
        .limit(200)

      if (data) {
        for (const article of data) {
          for (const tag of article.tags ?? []) {
            if (tag.startsWith("project:")) {
              const projectId = tag.slice("project:".length)
              if (!articlesByProject[projectId]) articlesByProject[projectId] = []
              articlesByProject[projectId].push({
                slug: article.slug,
                title: article.title,
                image_url: article.image_url ?? null,
                description: article.description ?? null,
                excerpt: article.excerpt ?? null,
                tags: article.tags ?? null,
              })
            }
          }
        }
      }
    } catch {
      // Supabase error — proceed without article links
    }
  }

  // ------------------------------------------------------------------
  // 3. Render
  // ------------------------------------------------------------------
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AlbertaMajorProjectsClient
        projects={projects}
        articlesByProject={articlesByProject}
        lastFetched={lastFetched}
      />
    </>
  )
}
