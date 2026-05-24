import type { Metadata } from "next"
import CostOfLivingClient from "./cost-of-living-client"
import { getFastArticles } from "@/lib/fast-articles"
import { Article } from "@/lib/types/article"

export const metadata: Metadata = {
  title: "Calgary vs Edmonton Cost of Living 2025 | Side-by-Side Comparison",
  description:
    "Compare the real cost of living in Calgary vs Edmonton in 2025. Rent, groceries, transit, utilities, home prices, property taxes, and more — all in one free tool.",
  keywords: [
    "Calgary vs Edmonton cost of living",
    "Calgary Edmonton comparison 2025",
    "is Calgary more expensive than Edmonton",
    "cost of living Alberta",
    "rent Calgary vs Edmonton",
    "home prices Calgary vs Edmonton",
    "Calgary Edmonton living cost comparison",
    "should I move to Calgary or Edmonton",
    "Calgary groceries vs Edmonton",
    "Calgary transit vs Edmonton",
    "Alberta cities cost comparison",
    "cheapest city Alberta",
    "Edmonton vs Calgary rent",
    "Calgary cost of living 2025",
    "Edmonton cost of living 2025",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living",
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
    title: "Calgary vs Edmonton Cost of Living 2025 — Side-by-Side Comparison",
    description:
      "Free 2025 comparison of Calgary and Edmonton costs: rent, groceries, transit, home prices, utilities, and more. See what you'd have left over after expenses.",
    url: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Calgary vs Edmonton Cost of Living 2025 — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calgary vs Edmonton Cost of Living 2025",
    description:
      "Compare rent, groceries, transit, and home prices between Calgary and Edmonton. See which city fits your budget.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const toolSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Calgary vs Edmonton Cost of Living Comparison 2025",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living",
  description:
    "A free side-by-side comparison of the cost of living in Calgary and Edmonton, Alberta. Covers rent, groceries, transit, home prices, utilities, parking, and more using 2025 data.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  publisher: {
    "@type": "Organization",
    name: "Culture Alberta",
    url: "https://www.culturealberta.com",
  },
  areaServed: {
    "@type": "Province",
    name: "Alberta",
    containedInPlace: { "@type": "Country", name: "Canada" },
  },
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    { "@type": "ListItem", position: 3, name: "Calgary vs Edmonton Cost of Living", item: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living" },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Calgary more expensive than Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generally yes. Calgary has significantly higher rental costs (roughly 20–30% more for a 1-bedroom) and higher home purchase prices. Edmonton has a higher property tax mill rate but the overall monthly cost of living is lower for most residents.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average rent in Calgary in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The average asking rent for a 1-bedroom apartment in Calgary is approximately $1,900–$2,000 per month in 2025, based on CMHC data. Prices vary significantly by neighbourhood.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average rent in Edmonton in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The average asking rent for a 1-bedroom apartment in Edmonton is approximately $1,400–$1,500 per month in 2025, making it notably cheaper than Calgary.",
      },
    },
    {
      "@type": "Question",
      name: "Which city has better job opportunities — Calgary or Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Both cities have strong labour markets. Calgary is the headquarters of Canada's oil and gas industry, with a growing finance and tech sector. Edmonton is the provincial capital with strong government, healthcare, and public sector employment. Average salaries in Calgary tend to be higher in private-sector roles.",
      },
    },
    {
      "@type": "Question",
      name: "Is Edmonton cheaper than Calgary for everything?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not for everything. Edmonton has higher property tax rates, and some utility and service costs are comparable. However, Edmonton's lower rent and home prices make it substantially cheaper overall for most households.",
      },
    },
  ],
}

const COL_KEYWORDS = ["calgary", "edmonton", "housing", "rent", "cost of living", "moving", "neighbourhood", "real estate", "home price", "apartment"]

async function getCityArticles(): Promise<Article[]> {
  try {
    const all = await getFastArticles()
    return (all as Article[])
      .filter(a => {
        const text = `${a.title} ${a.excerpt || ""} ${(a.tags || []).join(" ")} ${a.category || ""} ${a.location || ""}`.toLowerCase()
        return COL_KEYWORDS.some(kw => text.includes(kw))
      })
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 4)
  } catch {
    return []
  }
}

export default async function CalgaryVsEdmontonPage() {
  const relatedArticles = await getCityArticles()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CostOfLivingClient relatedArticles={relatedArticles} />
    </>
  )
}
