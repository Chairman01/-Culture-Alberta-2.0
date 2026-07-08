import { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import StatHolidayCalculatorClient from "./stat-holiday-calculator-client"
import { ToolEngagement } from "@/components/tool-engagement"

export const metadata: Metadata = {
  title: "Alberta Stat Holiday Pay Calculator 2026 | Culture Alberta",
  description:
    "Calculate your Alberta stat holiday pay instantly. Find out what you're owed for all 9 general holidays under the Employment Standards Code — whether you worked or not. Formula: 4-week wages ÷ 20. Free, no sign-up.",
  keywords: [
    "Alberta stat holiday pay calculator",
    "Alberta general holiday pay 2026",
    "stat holiday pay calculator Alberta",
    "Alberta Employment Standards holiday pay",
    "how is stat holiday pay calculated Alberta",
    "Alberta general holiday pay formula",
    "4 week wages divided by 20 Alberta",
    "worked on stat holiday Alberta pay",
    "Alberta stat holiday eligibility",
    "Alberta 9 general holidays",
    "Family Day Alberta pay calculator",
    "Canada Day holiday pay Alberta",
    "Labour Day holiday pay calculator Alberta",
    "stat holiday pay hourly Alberta",
    "stat holiday pay salaried Alberta",
    "Alberta stat holiday 2026 dates",
    "general holiday pay Alberta",
    "Alberta Employment Standards Code holiday",
  ],
  alternates: {
    canonical: "https://www.culturealberta.com/tools/stat-holiday-calculator",
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
    title: "Alberta Stat Holiday Pay Calculator 2026 | Culture Alberta",
    description:
      "Find out what you're owed for Alberta's 9 general holidays. Free calculator — covers hourly, salary, and variable hours. Formula: 4-week wages ÷ 20.",
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
      "Calculate your Alberta stat holiday pay instantly. All 9 general holidays covered. Formula: 4-week wages ÷ 20.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Stat Holiday Pay Calculator 2026",
  alternateName: "Alberta General Holiday Pay Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  url: "https://www.culturealberta.com/tools/stat-holiday-calculator",
  description:
    "Free calculator to determine Alberta general holiday (stat holiday) pay entitlements under the Employment Standards Code. Covers all 9 Alberta general holidays for 2026. Formula: total wages in the 4 weeks before the holiday divided by 20.",
  featureList: [
    "Alberta general holiday pay calculation using the official 4-week wages ÷ 20 formula",
    "Hourly and salaried employee support",
    "Variable hours / custom 4-week wage manual override",
    "Worked-on-holiday pay calculation (Option A: regular wages + general holiday pay)",
    "Employer Option B calculation (1.5× wages + substitute day off)",
    "Annual stat holiday pay projection across all 9 general holidays",
    "2026 Alberta general holiday countdown and full schedule",
    "Eligibility checklist under the Employment Standards Code",
  ],
  offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
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
    containedInPlace: { "@type": "Country", name: "Canada" },
  },
  keywords:
    "Alberta stat holiday pay calculator, general holiday pay Alberta, 4-week wages divided by 20, Employment Standards Code holiday pay, Alberta 9 general holidays 2026",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".stat-holiday-formula"],
    xpath: ["/html/head/title"],
  },
  about: {
    "@type": "Legislation",
    name: "Alberta Employment Standards Code — General Holiday Pay",
    description:
      "Alberta provincial legislation requiring employers to pay general holiday (stat holiday) pay equal to an employee's total wages in the 4 weeks before the holiday divided by 20.",
    legislationIdentifier: "RSA 2000, c E-9",
    jurisdiction: { "@type": "AdministrativeArea", name: "Alberta, Canada" },
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

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Calculate Alberta Stat Holiday Pay",
  description:
    "Use this free calculator to find out how much general holiday pay you are owed under the Alberta Employment Standards Code.",
  totalTime: "PT2M",
  tool: [{ "@type": "HowToTool", name: "Alberta Stat Holiday Pay Calculator" }],
  supply: [
    { "@type": "HowToSupply", name: "Your hourly wage or annual salary" },
    { "@type": "HowToSupply", name: "Total wages earned in the 4 weeks before the holiday (excluding overtime and tips)" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Enter your pay details",
      text: "Choose hourly or salaried and enter your wage or annual salary. For variable hours or casual work, use the manual option to enter your total 4-week wages directly. Do not include overtime pay or tips.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Select whether you worked the holiday",
      text: "Indicate whether you had the stat holiday off or worked it. If you worked, enter the number of hours worked on that day.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Press Calculate and review your result",
      text: "The calculator applies the Alberta formula (4-week wages ÷ 20) to show your general holiday pay. If you worked, it also shows your total wages for that day. An annual projection shows what all 9 holidays are worth per year.",
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
        text: "Most employees covered by Alberta's Employment Standards Code qualify. You must have worked for the same employer for at least 30 days before the holiday and worked your last scheduled shift before and first scheduled shift after the holiday (unless absent for valid reasons such as illness or approved leave).",
      },
    },
    {
      "@type": "Question",
      name: "How is stat holiday pay calculated in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta uses the formula: total wages earned in the 4 weeks immediately before the general holiday, divided by 20. The number 20 represents the typical working days in a 4-week period. This gives approximately your average daily wage. Wages include regular pay and commissions, but not overtime, tips, or general holiday pay previously paid.",
      },
    },
    {
      "@type": "Question",
      name: "What are Alberta's 9 general holidays in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta's 9 general holidays in 2026 are: New Year's Day (January 1), Family Day (February 16), Good Friday (April 3), Victoria Day (May 18), Canada Day (July 1), Labour Day (September 7), Thanksgiving Day (October 12), Remembrance Day (November 11), and Christmas Day (December 25).",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I work on a stat holiday in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If you work on a general holiday you receive your regular wages for hours worked plus general holiday pay (Option A). Your employer may alternatively pay 1.5x regular wages for hours worked and give you a substitute day off with pay equal to your general holiday pay (Option B). The employer chooses which option to provide.",
      },
    },
    {
      "@type": "Question",
      name: "Does overtime pay count in the 4-week wage calculation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Overtime pay is excluded from the 4-week earnings total when calculating Alberta general holiday pay. Only regular wages, salary, and commissions are included. If a significant portion of your income is overtime, your general holiday pay will be based on your regular earnings only.",
      },
    },
    {
      "@type": "Question",
      name: "My hours vary week to week — how do I calculate accurately?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the manual 4-week wages option in the calculator. Add up every dollar you earned in regular wages (excluding overtime and tips) in the 4 complete weeks immediately before the holiday. Divide that total by 20 for your general holiday pay. This is the most accurate approach for casual, part-time, or shift workers with variable hours.",
      },
    },
    {
      "@type": "Question",
      name: "Can my employer substitute a different day off instead of the stat holiday?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Employers and employees can agree in writing to substitute another day as the general holiday. The substitute day must occur within 30 days before or after the general holiday, or within a period agreed to in a collective agreement. The employee still receives general holiday pay on the substitute day.",
      },
    },
  ],
}

export default async function StatHolidayCalculatorPage() {
  // Fetch articles tagged "stat-holiday" dynamically so new articles appear automatically
  const { data } = await supabase
    .from("articles")
    .select("slug, title, image_url, description, excerpt")
    .contains("tags", ["stat-holiday"])
    .not("image_url", "is", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4)

  const dynamicRelated = (data ?? []).map((a, i) => ({
    href: `/articles/${a.slug}`,
    label: "Alberta",
    title: a.title as string,
    description: (a.description ?? a.excerpt ?? "") as string,
    image: (a.image_url ?? "") as string,
    featured: i === 0,
  }))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div data-tool-root>
        <StatHolidayCalculatorClient relatedArticles={dynamicRelated.length > 0 ? dynamicRelated : undefined} />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="stat-holiday-calculator" />
        </div>
      </div>
    </>
  )
}
