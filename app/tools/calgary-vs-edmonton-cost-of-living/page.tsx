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

const TODAY = new Date().toISOString().split("T")[0]

const toolSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Calgary vs Edmonton Cost of Living Comparison 2025",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living",
  datePublished: "2025-05-01",
  dateModified: TODAY,
  description:
    "A free side-by-side comparison of the cost of living in Calgary and Edmonton, Alberta. Covers rent, groceries, transit, home prices, utilities, parking, and more using 2025 data from CMHC, Statistics Canada, and CREA.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  publisher: { "@type": "Organization", name: "Culture Alberta", url: "https://www.culturealberta.com" },
  areaServed: [
    { "@type": "City", name: "Calgary", containedInPlace: { "@type": "Province", name: "Alberta" } },
    { "@type": "City", name: "Edmonton", containedInPlace: { "@type": "Province", name: "Alberta" } },
  ],
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".city-summary-cards"],
  },
}

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Calgary vs Edmonton Cost of Living Data 2025",
  description: "Side-by-side comparison of cost of living metrics for Calgary and Edmonton, Alberta, including rent, groceries, transit, home prices, utilities, and parking. Data compiled from CMHC, Statistics Canada, CREA, and city sources.",
  url: "https://www.culturealberta.com/tools/calgary-vs-edmonton-cost-of-living",
  dateModified: TODAY,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Organization", name: "Culture Alberta", url: "https://www.culturealberta.com" },
  citation: [
    { "@type": "CreativeWork", name: "CMHC Rental Market Report 2024", publisher: { "@type": "Organization", name: "Canada Mortgage and Housing Corporation" } },
    { "@type": "CreativeWork", name: "CREA MLS Home Price Index 2025", publisher: { "@type": "Organization", name: "Canadian Real Estate Association" } },
    { "@type": "CreativeWork", name: "Statistics Canada Consumer Price Index", publisher: { "@type": "Organization", name: "Statistics Canada" } },
  ],
  spatialCoverage: [
    { "@type": "City", name: "Calgary", containedInPlace: { "@type": "Province", name: "Alberta", containedInPlace: { "@type": "Country", name: "Canada" } } },
    { "@type": "City", name: "Edmonton", containedInPlace: { "@type": "Province", name: "Alberta", containedInPlace: { "@type": "Country", name: "Canada" } } },
  ],
  variableMeasured: [
    { "@type": "PropertyValue", name: "Average 1-Bedroom Rent — Calgary", value: "1920", unitText: "CAD/month" },
    { "@type": "PropertyValue", name: "Average 1-Bedroom Rent — Edmonton", value: "1440", unitText: "CAD/month" },
    { "@type": "PropertyValue", name: "Average Home Price — Calgary", value: "610000", unitText: "CAD" },
    { "@type": "PropertyValue", name: "Average Home Price — Edmonton", value: "430000", unitText: "CAD" },
    { "@type": "PropertyValue", name: "Monthly Transit Pass — Calgary", value: "115", unitText: "CAD/month" },
    { "@type": "PropertyValue", name: "Monthly Transit Pass — Edmonton", value: "100", unitText: "CAD/month" },
  ],
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
        text: "Yes, Calgary is generally more expensive than Edmonton. Calgary's average 1-bedroom rent is approximately $1,920/month versus $1,440/month in Edmonton — about 33% higher. Home prices are also roughly $180,000 higher in Calgary (benchmark ~$610,000 vs ~$430,000). Edmonton's overall monthly cost of living baseline is approximately $2,310 compared to $2,855 in Calgary.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average rent in Calgary in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The average asking rent for a 1-bedroom apartment in Calgary is approximately $1,920 per month in 2025, according to CMHC data. A 2-bedroom averages around $2,350/month. Prices vary by neighbourhood — inner-city areas like Beltline and Kensington are higher, while the suburbs are cheaper.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average rent in Edmonton in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The average asking rent for a 1-bedroom apartment in Edmonton is approximately $1,440 per month in 2025, based on CMHC data. A 2-bedroom averages around $1,790/month. Edmonton remains one of the more affordable major Canadian cities for renters.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost to live in Calgary per month?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A single adult living in Calgary should budget approximately $2,855/month for core expenses: rent ($1,920), transit ($115), utilities ($160), groceries ($520), gym ($55), and internet ($85). Actual costs vary by lifestyle, neighbourhood, and whether you own a car.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost to live in Edmonton per month?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A single adult living in Edmonton should budget approximately $2,310/month for core expenses: rent ($1,440), transit ($100), utilities ($145), groceries ($500), gym ($45), and internet ($80). Edmonton is notably more affordable than Calgary for most residents.",
      },
    },
    {
      "@type": "Question",
      name: "Which city has better job opportunities — Calgary or Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Both cities have strong labour markets but in different sectors. Calgary is Canada's oil and gas capital and has a growing finance and tech sector — average private-sector salaries tend to be higher. Edmonton is Alberta's capital city with strong government, healthcare, education, and public sector employment. The higher Calgary salaries often offset (but don't always cover) the higher cost of living.",
      },
    },
    {
      "@type": "Question",
      name: "Is Edmonton cheaper than Calgary for everything?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not for everything. Edmonton has a higher property tax mill rate, making annual property taxes slightly higher on equivalent homes. Some utility costs are similar. However, for rent, home prices, parking, and dining out, Edmonton is consistently cheaper — making it substantially more affordable overall.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average home price in Calgary vs Edmonton in 2025?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "As of early 2025, the CREA MLS benchmark composite home price is approximately $610,000 in Calgary and $430,000 in Edmonton — a difference of roughly $180,000. Calgary has seen stronger price growth driven by migration from Ontario and BC.",
      },
    },
    {
      "@type": "Question",
      name: "Should I move to Calgary or Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on your priorities. Choose Calgary if you work in oil and gas, finance, or tech; value a larger city feel; or want proximity to the mountains. Choose Edmonton if you prefer lower rent and housing costs, work in government or healthcare, or prioritize affordability. Both cities have no provincial income tax advantage — Alberta has no provincial sales tax (PST).",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CostOfLivingClient relatedArticles={relatedArticles} />
    </>
  )
}
