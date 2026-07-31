import type { Metadata } from "next"
import RentalIncreaseCalculatorClient from "./rental-increase-calculator-client"
import { ToolEngagement } from "@/components/tool-engagement"
import { getFastArticles } from "@/lib/fast-articles"
import { Article } from "@/lib/types/article"
import { RENT_INCREASE_FAQ, MIN_DAYS_BETWEEN_INCREASES } from "@/lib/alberta-tenancy"

const PAGE_URL = "https://www.culturealberta.com/tools/alberta-rental-increase-calculator"

// Baked at build time. The page is statically prerendered, so this stays in sync
// with the year shown in the UI instead of going stale in a hardcoded string.
const NOW = new Date()
const YEAR = NOW.getFullYear()
const TODAY = NOW.toISOString().split("T")[0]

export const metadata: Metadata = {
  title: `Alberta Rent Increase Calculator ${YEAR} | Is Your Rent Increase Legal?`,
  description:
    `Free Alberta rent increase calculator. Check your notice period, the once-every-${MIN_DAYS_BETWEEN_INCREASES}-days rule and your tenancy type, see how much more you'll pay per month and per year, and get a ready-to-send letter if the increase breaks the rules.`,
  keywords: [
    "Alberta rent increase calculator",
    `Alberta rent increase ${YEAR}`,
    "Alberta rent increase rules",
    "how much can landlord raise rent Alberta",
    "Alberta rent increase notice",
    "3 month notice rent Alberta",
    "Alberta residential tenancies rent increase",
    "is my rent increase legal Alberta",
    `Alberta rent control ${YEAR}`,
    "rent increase calculator Canada",
    "Alberta landlord tenant rent rules",
    "residential tenancy act Alberta rent",
    "how much notice for rent increase Alberta",
    "Alberta rent increase limit",
    "Calgary rent increase calculator",
    "Edmonton rent increase calculator",
    "rent increase fixed term lease Alberta",
    "mobile home site rent increase Alberta",
  ].join(", "),
  alternates: { canonical: PAGE_URL },
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
    title: `Alberta Rent Increase Calculator ${YEAR} — Is Your Rent Increase Legal?`,
    description:
      "Check an Alberta rent increase against the law. Notice period by tenancy type, the 365-day rule, what it costs you, and a letter you can send. Free — no sign-up.",
    url: PAGE_URL,
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: `Alberta Rent Increase Calculator ${YEAR} — Culture Alberta`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Alberta Rent Increase Calculator ${YEAR}`,
    description:
      "Check if your Alberta rent increase is legal. Notice period, the 365-day rule, and a ready-to-send letter.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Alberta Rent Increase Calculator ${YEAR}`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: PAGE_URL,
  datePublished: "2025-05-01",
  dateModified: TODAY,
  description:
    "A free calculator for Alberta tenants and landlords. Checks a rent increase against the notice period for your tenancy type, the 365-day rule between increases, and the ban on increases during a fixed-term lease. Calculates monthly and annual cost increases and drafts a letter to the landlord.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  publisher: { "@type": "Organization", name: "Culture Alberta", url: "https://www.culturealberta.com" },
  areaServed: [
    { "@type": "City", name: "Calgary", containedInPlace: { "@type": "Province", name: "Alberta" } },
    { "@type": "City", name: "Edmonton", containedInPlace: { "@type": "Province", name: "Alberta" } },
    { "@type": "Province", name: "Alberta", containedInPlace: { "@type": "Country", name: "Canada" } },
  ],
  about: {
    "@type": "Legislation",
    name: "Alberta Residential Tenancies Act",
    identifier: "RSA 2000, c R-17.1",
    jurisdiction: { "@type": "Province", name: "Alberta" },
  },
  featureList: [
    "Notice period check by tenancy type",
    "365-day rule between rent increases",
    "Fixed-term lease increase ban",
    "Monthly and annual cost impact",
    "Ready-to-send letter to your landlord",
  ],
  keywords:
    "Alberta rent increase calculator, rent increase notice Alberta, Alberta residential tenancies act, rent increase legal Alberta, how much notice rent increase Alberta, Alberta tenant rights rent",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".rental-rules-summary"],
  },
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Check if an Alberta Rent Increase is Legal",
  description:
    "Use this free tool to check whether a landlord's rent increase in Alberta meets the notice period for your tenancy type and the 365-day rule under the Residential Tenancies Act.",
  totalTime: "PT2M",
  tool: [{ "@type": "HowToTool", name: "Alberta Rent Increase Calculator (free)" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Pick your tenancy type",
      text: "Choose month to month, fixed term, week to week, another periodic term, or a mobile home site. This sets how much notice your landlord owes you: 3 full tenancy months, 84 days, 90 days or 180 days. Rent cannot be raised at all during a fixed term.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Enter your current and proposed rent",
      text: "Type what you pay now and what the landlord wants to charge. The calculator shows the monthly, percentage and annual difference.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Enter the date written notice was given",
      text: "The calculator returns the earliest date the increase can legally take effect for your tenancy type. For a month-to-month tenancy that is the first day of the fourth month after the notice.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Enter the start date and your last increase",
      text: "The tool checks the start date against the notice requirement and confirms at least 365 days have passed since the last increase or your move-in date.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Copy the letter if the increase fails a check",
      text: "If a rule was missed, the tool drafts a letter naming the specific rule so you can send it to your landlord in writing.",
    },
  ],
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    { "@type": "ListItem", position: 3, name: "Alberta Rent Increase Calculator", item: PAGE_URL },
  ],
}

// Built from the same array the page renders, so the structured data can never
// drift from the visible FAQ (Google requires them to match).
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: RENT_INCREASE_FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
}

// ---------------------------------------------------------------------------
// Related reading
//
// This used to substring-match a loose keyword list, which meant "rent" hit
// "current", "lease" hit "released" and "apartment" pulled in apartment fires
// and stabbings. Now: whole-word matches on high-signal housing terms, title and
// tags only (excerpts were the main source of false positives), and anything
// that reads as crime or disaster coverage is dropped.
// ---------------------------------------------------------------------------

/** Tenancy-law terms — the most useful thing to read next to this tool. */
const TENANCY_TERMS = [
  "tenant", "tenants", "tenancy", "tenancies",
  "landlord", "landlords",
  "lease", "leases", "leasing",
  "evict", "evicted", "eviction", "evictions",
  "sublet", "subletting",
]
const TENANCY_PHRASES = ["damage deposit", "rent control", "rent increase", "residential tenancies", "tenant rights"]

/** What rent actually costs — relevant, but less so than the rules. */
const RENT_TERMS = ["rent", "rents", "rental", "rentals", "renting", "renter", "renters"]

/** Housing context — weakest signal, used only to fill remaining slots. */
const HOUSING_TERMS = ["housing", "homelessness"]
const HOUSING_PHRASES = ["affordable housing", "cost of living", "housing market"]

// Housing is frequently just the setting for crime and disaster reporting, and
// short-term rentals are not residential tenancies. Neither belongs here.
const EXCLUDE_TERMS = [
  "murder", "murdered", "killed", "kills", "homicide", "stabbing", "stabbed",
  "shot", "shooting", "assault", "voyeurism", "arrested", "charged", "charges",
  "fire", "blaze", "dead", "death", "died", "fatal", "crash", "collision",
  "police", "suspect", "overdose", "flood", "flooded", "storm",
]
const EXCLUDE_PHRASES = ["vacation rental", "vacation rentals", "short-term rental", "short-term rentals", "airbnb"]

function hasWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(haystack)
}

/** 0 means not relevant. Higher scores rank first. */
function rentRelevance(article: Article): number {
  const title = article.title || ""
  const tags = (article.tags || []).join(" ")
  const haystack = `${title} ${tags}`
  const lower = haystack.toLowerCase()

  if (EXCLUDE_TERMS.some((t) => hasWord(title, t))) return 0
  if (EXCLUDE_PHRASES.some((p) => lower.includes(p))) return 0

  let score = 0
  if (TENANCY_PHRASES.some((p) => lower.includes(p))) score += 10
  if (TENANCY_TERMS.some((t) => hasWord(haystack, t))) score += 10
  if (RENT_TERMS.some((t) => hasWord(haystack, t))) score += 6
  if (HOUSING_PHRASES.some((p) => lower.includes(p))) score += 2
  if (HOUSING_TERMS.some((t) => hasWord(haystack, t))) score += 2
  return score
}

async function getRentArticles(): Promise<Article[]> {
  try {
    const all = (await getFastArticles()) as Article[]

    const scored = all
      .map((a) => ({ article: a, score: rentRelevance(a) }))
      .filter((x) => x.score > 0)

    // Rank by how relevant the piece is first, recency second. A tenant-rights
    // explainer stays useful indefinitely; a housing-market story does not, so
    // sorting purely by date buried the genuinely useful reading.
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const da = new Date(a.article.date || a.article.createdAt).getTime()
      const db = new Date(b.article.date || b.article.createdAt).getTime()
      return db - da
    })

    return scored.slice(0, 4).map((x) => x.article)
  } catch {
    return []
  }
}

export default async function AlbertaRentalIncreaseCalculatorPage() {
  const relatedArticles = await getRentArticles()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div data-tool-root>
        <RentalIncreaseCalculatorClient relatedArticles={relatedArticles} year={YEAR} />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="alberta-rental-increase-calculator" />
        </div>
      </div>
    </>
  )
}
