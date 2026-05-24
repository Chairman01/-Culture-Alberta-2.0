import type { Metadata } from "next"
import RentalIncreaseCalculatorClient from "./rental-increase-calculator-client"
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

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Rental Increase Calculator 2025",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/alberta-rental-increase-calculator",
  description:
    "A free calculator for Alberta tenants and landlords. Check if a rent increase follows the 3-month notice rule and 12-month frequency rule under the Alberta Residential Tenancies Act. Calculates monthly and annual cost increases.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CAD",
  },
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
  keywords: "Alberta rent increase calculator, rent increase notice Alberta, Alberta residential tenancies act, rent increase legal Alberta",
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
        text: "No. Alberta has no rent control and no maximum percentage cap on rent increases as of 2025. A landlord can raise rent by any amount, but must provide at least 3 full calendar months' written notice and can only raise rent once every 12 months.",
      },
    },
    {
      "@type": "Question",
      name: "How much notice does a landlord need to give for a rent increase in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Under the Alberta Residential Tenancies Act, a landlord must provide at least 3 full calendar months' written notice before a rent increase takes effect. For example, if notice is given on May 15, the earliest the increase can take effect is September 1. For mobile home site tenancies, 6 months' written notice is required.",
      },
    },
    {
      "@type": "Question",
      name: "Can my landlord raise my rent more than once per year in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Alberta law only allows one rent increase in any 12-month period. This applies regardless of what the lease agreement says.",
      },
    },
    {
      "@type": "Question",
      name: "What can I do if my landlord raises rent illegally in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If your landlord gives insufficient notice or raises rent more than once in 12 months, the increase is not enforceable. You can file a complaint with the Residential Tenancy Dispute Resolution Service (RTDRS) or take the matter to Provincial Court (Civil Division).",
      },
    },
    {
      "@type": "Question",
      name: "Does Alberta have rent control in Calgary or Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Neither Calgary nor Edmonton has local rent control. Alberta is a province with no rent control at either the municipal or provincial level as of 2025.",
      },
    },
  ],
}

const RENT_KEYWORDS = ["rent", "rental", "housing", "tenant", "landlord", "apartment", "affordable housing", "evict", "lease"]

async function getRentArticles(): Promise<Article[]> {
  try {
    const all = await getFastArticles()
    return (all as Article[])
      .filter(a => {
        const text = `${a.title} ${a.excerpt || ""} ${(a.tags || []).join(" ")} ${a.category || ""}`.toLowerCase()
        return RENT_KEYWORDS.some(kw => text.includes(kw))
      })
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 4)
  } catch {
    return []
  }
}

export default async function AlbertaRentalIncreaseCalculatorPage() {
  const relatedArticles = await getRentArticles()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <RentalIncreaseCalculatorClient relatedArticles={relatedArticles} />
    </>
  )
}
