import type { Metadata } from "next"
import AISHPaymentDatesClient from "./aish-payment-dates-client"
import { ToolEngagement } from "@/components/tool-engagement"

export const metadata: Metadata = {
  title: "AISH Payment Dates 2026 Alberta | When Does AISH Get Deposited",
  description:
    "AISH payment dates 2026 for Alberta — full schedule with exact deposit dates. AISH arrives the last banking day before each month. Live countdown to your next payment. Updated for 2026.",
  keywords: [
    "AISH payment dates 2026",
    "AISH deposit date Alberta",
    "when does AISH get deposited",
    "AISH payment schedule 2026",
    "next AISH payment date",
    "AISH payment dates Alberta",
    "Alberta AISH payment calendar",
    "AISH January 2026 payment date",
    "AISH February 2026 payment date",
    "AISH July 2026 payment date",
    "when is AISH deposited 2026",
    "AISH payment timing Alberta",
    "Alberta disability benefit payment dates",
    "AISH $1940 per month deposit",
    "AISH payment last banking day",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/aish-payment-dates",
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
    title: "AISH Payment Dates 2026 Alberta — Full Deposit Schedule",
    description:
      "When is your next AISH payment? Alberta AISH deposits arrive the last banking day before each month. Full 2026 schedule with live countdown to your next deposit.",
    url: "https://www.culturealberta.com/tools/aish-payment-dates",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "AISH Payment Dates 2026 Alberta — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AISH Payment Dates 2026 Alberta",
    description:
      "Full AISH deposit schedule for 2026. Payments arrive the last banking day before each month. Live countdown to your next payment.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

// ---------------------------------------------------------------------------
// Structured data — WebApplication
// ---------------------------------------------------------------------------
const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AISH Payment Dates 2026 Alberta",
  alternateName: "Alberta AISH Deposit Schedule 2026",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/aish-payment-dates",
  description:
    "A free tool showing the complete 2026 AISH (Assured Income for the Severely Handicapped) deposit schedule for Alberta. Shows the exact date each monthly payment is deposited, with a live countdown to the next payment.",
  featureList: [
    "Live countdown to next AISH deposit",
    "Full 2026 monthly deposit schedule",
    "Highlights upcoming and past payments",
    "Key facts about AISH payment timing",
    "Information about ADAP transition (July 2026)",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CAD",
  },
  publisher: {
    "@type": "Organization",
    name: "Culture Alberta",
    url: "https://www.culturealberta.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.culturealberta.com/images/ca-logo.png",
    },
  },
  areaServed: {
    "@type": "Province",
    name: "Alberta",
    containedInPlace: {
      "@type": "Country",
      name: "Canada",
    },
  },
  keywords:
    "AISH payment dates 2026, AISH deposit date Alberta, when does AISH get deposited, AISH payment schedule Alberta, next AISH payment",
  about: {
    "@type": "GovernmentService",
    name: "Assured Income for the Severely Handicapped (AISH)",
    description:
      "Alberta government program paying $1,940/month to Albertans permanently unable to work due to a severe disability.",
    provider: {
      "@type": "GovernmentOrganization",
      name: "Government of Alberta",
      url: "https://www.alberta.ca",
    },
    areaServed: { "@type": "Province", name: "Alberta" },
  },
}

// ---------------------------------------------------------------------------
// Structured data — BreadcrumbList
// ---------------------------------------------------------------------------
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://www.culturealberta.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Alberta Tools",
      item: "https://www.culturealberta.com/tools",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "AISH Payment Dates 2026",
      item: "https://www.culturealberta.com/tools/aish-payment-dates",
    },
  ],
}

// ---------------------------------------------------------------------------
// Structured data — FAQPage (AEO / GEO optimized)
// ---------------------------------------------------------------------------
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "When is the next AISH payment in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH payments in 2026 are deposited on the last banking day of the previous month. For example, the July 2026 AISH payment is deposited on June 30, 2026. The full 2026 schedule is: January — Dec 31 2025; February — Jan 30; March — Feb 27; April — Mar 31; May — Apr 30; June — May 29; July — Jun 30; August — Jul 31; September — Aug 31; October — Sep 30; November — Oct 30; December — Nov 30.",
      },
    },
    {
      "@type": "Question",
      name: "Why does AISH arrive before the month it is for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta deposits AISH on the last banking day of the previous month so that recipients have funds available at the beginning of the month the payment is intended for. This has been Alberta's standard AISH payment schedule for many years.",
      },
    },
    {
      "@type": "Question",
      name: "What is the AISH payment amount in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The AISH base benefit is $1,940 per month in 2026. AISH clients with dependent children receive an additional $232/month for the first child and $117/month for each additional child. If you have net employment income above $1,072/month, your AISH benefit is reduced by 50 cents for each dollar above that threshold.",
      },
    },
    {
      "@type": "Question",
      name: "What if my AISH payment did not arrive on the scheduled date?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If your AISH payment has not arrived by the scheduled deposit date, first allow 1–2 business days for your bank to process the deposit. If it has still not appeared after that, contact Alberta Supports at 1-877-644-9992 or visit your local Alberta Supports Centre.",
      },
    },
    {
      "@type": "Question",
      name: "Will AISH payment dates change when ADAP launches in July 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Current AISH clients continue receiving payments on the same schedule. The July 2026 ADAP launch means new applicants may be assessed for ADAP ($1,740/month) or AISH ($1,940/month). Existing AISH clients keep their $1,940 rate with a $200 transition bridge until at least December 31, 2027.",
      },
    },
    {
      "@type": "Question",
      name: "Is AISH income taxable in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH benefit payments are not subject to income tax. However, employment income earned while receiving AISH may be taxable depending on your total annual income. Always confirm your specific tax situation with a professional or Alberta Supports.",
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Structured data — Event list (each payment date as a FinancialProduct event)
// ---------------------------------------------------------------------------
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AISH 2026 Payment Deposit Dates",
  description: "Complete schedule of AISH (Assured Income for the Severely Handicapped) deposit dates for 2026 in Alberta, Canada.",
  itemListElement: [
    { "@type": "ListItem", position: 1,  name: "AISH January 2026 payment",   description: "Deposited December 31, 2025"  },
    { "@type": "ListItem", position: 2,  name: "AISH February 2026 payment",  description: "Deposited January 30, 2026"   },
    { "@type": "ListItem", position: 3,  name: "AISH March 2026 payment",     description: "Deposited February 27, 2026"  },
    { "@type": "ListItem", position: 4,  name: "AISH April 2026 payment",     description: "Deposited March 31, 2026"     },
    { "@type": "ListItem", position: 5,  name: "AISH May 2026 payment",       description: "Deposited April 30, 2026"     },
    { "@type": "ListItem", position: 6,  name: "AISH June 2026 payment",      description: "Deposited May 29, 2026"       },
    { "@type": "ListItem", position: 7,  name: "AISH July 2026 payment",      description: "Deposited June 30, 2026"      },
    { "@type": "ListItem", position: 8,  name: "AISH August 2026 payment",    description: "Deposited July 31, 2026"      },
    { "@type": "ListItem", position: 9,  name: "AISH September 2026 payment", description: "Deposited August 31, 2026"    },
    { "@type": "ListItem", position: 10, name: "AISH October 2026 payment",   description: "Deposited September 30, 2026" },
    { "@type": "ListItem", position: 11, name: "AISH November 2026 payment",  description: "Deposited October 30, 2026"   },
    { "@type": "ListItem", position: 12, name: "AISH December 2026 payment",  description: "Deposited November 30, 2026"  },
  ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AISHPaymentDatesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <div data-tool-root>
        <AISHPaymentDatesClient />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="aish-payment-dates" />
        </div>
      </div>
    </>
  )
}
