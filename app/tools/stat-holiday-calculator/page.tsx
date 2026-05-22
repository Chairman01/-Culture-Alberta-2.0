import { Metadata } from "next"
import StatHolidayCalculatorClient from "./stat-holiday-calculator-client"

export const metadata: Metadata = {
  title: "Alberta Stat Holiday Pay Calculator 2026 | Culture Alberta",
  description:
    "Calculate your Alberta stat holiday pay instantly. Find out what you're owed for all 9 general holidays under the Employment Standards Code — whether you worked or not. Free, no sign-up.",
  keywords: [
    "Alberta stat holiday pay calculator",
    "Alberta general holiday pay 2026",
    "stat holiday pay calculator Alberta",
    "Alberta Employment Standards holiday pay",
    "how is stat holiday pay calculated Alberta",
    "Alberta general holiday pay formula",
    "worked on stat holiday Alberta pay",
    "Alberta stat holiday eligibility",
    "Alberta 9 general holidays",
    "Family Day Alberta pay calculator",
    "Canada Day holiday pay Alberta",
    "Labour Day holiday pay calculator Alberta",
    "stat holiday pay hourly Alberta",
    "stat holiday pay salaried Alberta",
    "Alberta stat holiday 2026 dates",
  ],
  alternates: {
    canonical: "https://www.culturealberta.com/tools/stat-holiday-calculator",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Alberta Stat Holiday Pay Calculator 2026 | Culture Alberta",
    description:
      "Find out what you're owed for Alberta's 9 general holidays. Free calculator — covers hourly, salary, and variable hours.",
    url: "https://www.culturealberta.com/tools/stat-holiday-calculator",
    siteName: "Culture Alberta",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Alberta Stat Holiday Pay Calculator — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Stat Holiday Pay Calculator 2026",
    description:
      "Calculate your Alberta stat holiday pay instantly. All 9 general holidays covered.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Stat Holiday Pay Calculator 2026",
  description:
    "Free calculator to determine Alberta general holiday (stat holiday) pay entitlements under the Employment Standards Code. Covers all 9 Alberta general holidays.",
  url: "https://www.culturealberta.com/tools/stat-holiday-calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  publisher: {
    "@type": "Organization",
    name: "Culture Alberta",
    url: "https://www.culturealberta.com",
  },
  audience: {
    "@type": "Audience",
    geographicArea: { "@type": "AdministrativeArea", name: "Alberta, Canada" },
  },
}

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Stat Holiday Pay Calculator",
      item: "https://www.culturealberta.com/tools/stat-holiday-calculator",
    },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who is eligible for stat holiday pay in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most employees covered by Alberta's Employment Standards Code qualify. You must have worked for the same employer for at least 30 days before the holiday and worked your last scheduled shift before and first scheduled shift after the holiday (unless absent for valid reasons).",
      },
    },
    {
      "@type": "Question",
      name: "How is stat holiday pay calculated in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta uses the formula: total wages earned in the 4 weeks before the holiday divided by 20. This gives your average daily wage. Wages include regular pay and commissions, but not overtime or tips.",
      },
    },
    {
      "@type": "Question",
      name: "What are Alberta's 9 general holidays in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta's 9 general holidays in 2026 are: New Year's Day (Jan 1), Family Day (Feb 16), Good Friday (Apr 3), Victoria Day (May 18), Canada Day (Jul 1), Labour Day (Sep 7), Thanksgiving Day (Oct 12), Remembrance Day (Nov 11), and Christmas Day (Dec 25).",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I work on a stat holiday in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If you work on a general holiday you receive your regular wages for hours worked plus general holiday pay (Option A). Your employer may alternatively pay 1.5x regular wages and give you a substitute day off (Option B). The employer chooses which option to provide.",
      },
    },
  ],
}

export default function StatHolidayCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <StatHolidayCalculatorClient />
    </>
  )
}
