import type { Metadata } from "next"
import RentalIncreaseCalculatorClient from "./rental-increase-calculator-client"
import { ToolEngagement } from "@/components/tool-engagement"
import { getFastArticles } from "@/lib/fast-articles"
import { Article } from "@/lib/types/article"

export const metadata: Metadata = {
  title: "Alberta Rental Increase Calculator 2025 | Check If Your Rent Increase Is Legal",
  description:
    "Free Alberta rent increase calculator. Check if your landlord's rent increase follows Alberta's 3-month notice rule and 12-month rule. See exactly how much more you'll pay per month and per year. No rent control cap in Alberta — but rules still apply.",
  keywords: [
    "Alberta rental increase calculator",
    "Alberta rent increase 2025",
    "Alberta rent increase rules",
    "how much can landlord raise rent Alberta",
    "Alberta rent increase notice",
    "3 month notice rent Alberta",
    "Alberta residential tenancies rent increase",
    "is my rent increase legal Alberta",
    "Alberta rent control 2025",
    "rent increase calculator Canada",
    "Alberta landlord tenant rent rules",
    "residential tenancy act Alberta rent",
    "how much notice for rent increase Alberta",
    "Alberta rent increase limit",
    "Calgary rent increase calculator",
    "Edmonton rent increase calculator",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/alberta-rental-increase-calculator",
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
    title: "Alberta Rental Increase Calculator 2025 — Is Your Rent Increase Legal?",
    description:
      "Check if an Alberta rent increase follows the law. See how much extra you'll pay, verify 3-month notice, and confirm the 12-month rule. Free — no sign-up.",
    url: "https://www.culturealberta.com/tools/alberta-rental-increase-calculator",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Alberta Rental Increase Calculator 2025 — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Rental Increase Calculator 2025",
    description:
      "Check if your Alberta rent increase is legal. Verify 3-month notice, 12-month rule, and see how much more you'll pay.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const TODAY = new Date().toISOString().split("T")[0]

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Rental Increase Calculator 2025",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/alberta-rental-increase-calculator",
  datePublished: "2025-05-01",
  dateModified: TODAY,
  description:
    "A free calculator for Alberta tenants and landlords. Check if a rent increase follows the 3-month notice rule and 12-month frequency rule under the Alberta Residential Tenancies Act. Calculates monthly and annual cost increases.",
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
  keywords: "Alberta rent increase calculator, rent increase notice Alberta, Alberta residential tenancies act, rent increase legal Alberta, how much notice rent increase Alberta, Alberta tenant rights rent",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".rental-rules-summary"],
  },
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Check if an Alberta Rent Increase is Legal",
  description: "Use this free tool to verify whether a landlord's rent increase in Alberta follows the 3-month notice rule and once-per-year rule under the Residential Tenancies Act.",
  totalTime: "PT2M",
  tool: [{ "@type": "HowToTool", name: "Alberta Rental Increase Calculator (free)" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Enter your current rent",
      text: "Type the amount you currently pay each month.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Enter the proposed new rent",
      text: "Enter the amount your landlord wants to charge. The calculator will show the monthly and annual difference.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Enter the date written notice was given",
      text: "The calculator will tell you the earliest legal date the increase can take effect — 3 full calendar months after the notice date.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Enter the proposed start date and last increase date",
      text: "The tool checks whether the start date respects the 3-month notice requirement and whether at least 12 months have passed since the last increase.",
    },
  ],
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    { "@type": "ListItem", position: 3, name: "Alberta Rental Increase Calculator", item: "https://www.culturealberta.com/tools/alberta-rental-increase-calculator" },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a rent increase cap in Alberta in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Alberta has no rent control and no maximum percentage cap on rent increases as of 2025. A landlord can raise rent by any amount — $50 or $500 — but must provide at least 3 full calendar months' written notice and can only raise rent once in any 12-month period.",
      },
    },
    {
      "@type": "Question",
      name: "How much notice does a landlord need to give for a rent increase in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Under the Alberta Residential Tenancies Act (RSA 2000, c R-17.1), a landlord must provide at least 3 full calendar months' written notice before a rent increase takes effect. For example, written notice given on May 15 means the earliest legal start date is September 1. For mobile home site tenancies, 6 months' written notice is required.",
      },
    },
    {
      "@type": "Question",
      name: "Can my landlord raise my rent more than once per year in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Alberta law only permits one rent increase in any 12-month period, regardless of what the lease says. If your landlord attempts a second increase within 12 months, it is not legally enforceable.",
      },
    },
    {
      "@type": "Question",
      name: "When does a rent increase take effect in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A rent increase in Alberta takes effect on the first day of a rental period that is at least 3 full calendar months after written notice is given. If notice is given April 1, the increase can take effect July 1 at the earliest.",
      },
    },
    {
      "@type": "Question",
      name: "What can I do if my landlord raises rent illegally in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An illegal rent increase — one with insufficient notice or within 12 months of the last increase — is not enforceable. You have three options: (1) write back to your landlord noting the specific rule that was not followed; (2) file a complaint with the Residential Tenancy Dispute Resolution Service (RTDRS) online for $75; or (3) take the matter to Provincial Court (Civil Division).",
      },
    },
    {
      "@type": "Question",
      name: "Does Alberta have rent control in Calgary or Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Neither Calgary nor Edmonton has local rent control, and Alberta has no provincial rent control legislation as of 2025. The only protections are procedural: 3 months written notice and once-per-year frequency.",
      },
    },
    {
      "@type": "Question",
      name: "How much can a landlord raise rent in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There is no legal maximum. In Alberta, a landlord can raise rent by any dollar amount as long as they give at least 3 full calendar months' written notice and have not raised rent in the past 12 months.",
      },
    },
    {
      "@type": "Question",
      name: "Does verbal notice count for a rent increase in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Verbal notice is not valid for a rent increase in Alberta. The Residential Tenancies Act requires written notice specifying the new rent amount and the date it takes effect.",
      },
    },
  ],
}

const RENT_KEYWORDS = ["rent", "rental", "housing", "tenant", "landlord", "apartment", "affordable housing", "evict", "lease"]

async function getRentArticles(): Promise<Article[]> {
  try {
    const all = await getFastArticles()
    const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000
    const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000

    const matches = (all as Article[]).filter(a => {
      const text = `${a.title} ${a.excerpt || ""} ${(a.tags || []).join(" ")} ${a.category || ""}`.toLowerCase()
      return RENT_KEYWORDS.some(kw => text.includes(kw))
    })

    const sorted = matches.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())

    // Prefer articles from the last 30 days; fall back to 90 days if not enough
    const recent = sorted.filter(a => new Date(a.date || a.createdAt).getTime() > cutoff30)
    if (recent.length >= 2) return recent.slice(0, 4)

    return sorted.filter(a => new Date(a.date || a.createdAt).getTime() > cutoff90).slice(0, 4)
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
        <RentalIncreaseCalculatorClient relatedArticles={relatedArticles} />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="alberta-rental-increase-calculator" />
        </div>
      </div>
    </>
  )
}
