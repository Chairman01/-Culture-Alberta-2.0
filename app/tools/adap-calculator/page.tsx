import type { Metadata } from "next"
import ADAPCalculatorClient from "./adap-calculator-client"

export const metadata: Metadata = {
  title: "ADAP Calculator Alberta 2026 | ADAP vs AISH Payment Comparison",
  description:
    "Free ADAP calculator for Alberta 2026. Compare the ADAP benefit ($1,740/month) against AISH ($1,940/month) based on your employment income. See the $200 difference at zero income and how benefits change as you earn more. Updated for July 2026 launch.",
  keywords: [
    "ADAP calculator Alberta",
    "ADAP vs AISH calculator",
    "Alberta Disability Assistance Program calculator",
    "ADAP Alberta 2026",
    "ADAP $1740 per month",
    "AISH $1940 per month",
    "ADAP vs AISH difference",
    "Alberta disability benefit comparison",
    "ADAP income exemption calculator",
    "ADAP July 2026",
    "Alberta new disability program 2026",
    "ADAP application Alberta",
    "disability benefit calculator Alberta",
    "AISH vs ADAP comparison",
    "how much does ADAP pay Alberta",
    "Alberta disability assistance program amount",
    "ADAP vs AISH $200 difference",
    "disability income Alberta 2026",
    "Alberta disability support calculator",
    "ADAP clawback calculator",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/adap-calculator",
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
    title: "ADAP Calculator Alberta 2026 — Compare ADAP vs AISH Benefits",
    description:
      "Compare ADAP ($1,740/month) against AISH ($1,940/month) based on your employment income. See the $200 monthly difference and how it changes as you earn more. Free and updated for July 2026.",
    url: "https://www.culturealberta.com/tools/adap-calculator",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "ADAP Calculator Alberta 2026 — ADAP vs AISH Comparison — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ADAP Calculator Alberta 2026 — ADAP vs AISH Benefits",
    description:
      "ADAP pays $1,740/month, AISH pays $1,940/month. See the $200 difference and how benefits change with your income. Free calculator for Alberta 2026.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

// ---------------------------------------------------------------------------
// Structured data — WebApplication (calculator)
// ---------------------------------------------------------------------------
const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ADAP Calculator Alberta 2026",
  alternateName: "Alberta Disability Assistance Program Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/adap-calculator",
  description:
    "A free calculator comparing the ADAP benefit ($1,740/month, launching July 2026) against the AISH benefit ($1,940/month) based on employment income. Shows the monthly dollar difference between the two Alberta disability programs using 2026 rates.",
  featureList: [
    "Side-by-side ADAP vs AISH monthly benefit comparison",
    "ADAP income exemption and clawback ($700/month exempt, 50-cent reduction above that)",
    "AISH income exemption and clawback ($1,072/month exempt, graduated reduction)",
    "Monthly and annual difference calculation",
    "AISH child benefit calculation",
    "Single and family exemption types",
    "Explanation of why the benefit gap changes with income",
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
      url: "https://www.culturealberta.com/images/culture-alberta-logo.svg",
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
    "ADAP calculator Alberta, ADAP vs AISH, Alberta Disability Assistance Program 2026, disability benefit comparison Alberta, ADAP $1740, AISH $1940",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".adap-key-facts"],
    xpath: ["/html/head/title"],
  },
  about: [
    {
      "@type": "GovernmentService",
      name: "Alberta Disability Assistance Program (ADAP)",
      description:
        "New Alberta government disability program launching July 1 2026. Pays $1,740/month to Albertans with a severe and permanent disability who are assessed as able to work to some degree. First $700/month of employment income is fully exempt.",
      provider: {
        "@type": "GovernmentOrganization",
        name: "Government of Alberta",
        url: "https://www.alberta.ca",
      },
      areaServed: { "@type": "Province", name: "Alberta" },
    },
    {
      "@type": "GovernmentService",
      name: "Assured Income for the Severely Handicapped (AISH)",
      description:
        "Alberta government program paying $1,940/month to Albertans permanently unable to work due to a severe disability. First $1,072/month of employment income is fully exempt.",
      provider: {
        "@type": "GovernmentOrganization",
        name: "Government of Alberta",
        url: "https://www.alberta.ca",
      },
      areaServed: { "@type": "Province", name: "Alberta" },
    },
  ],
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
      name: "ADAP Calculator",
      item: "https://www.culturealberta.com/tools/adap-calculator",
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
      name: "What is ADAP in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ADAP stands for Alberta Disability Assistance Program. It is a new Alberta government disability benefit launching July 1, 2026. ADAP pays $1,740 per month to Albertans with a severe and permanent disability who are assessed as being able to work to some degree. It replaces the previous AISH program for new applicants who can work, while AISH ($1,940/month) continues for those who are permanently unable to work.",
      },
    },
    {
      "@type": "Question",
      name: "How much does ADAP pay in Alberta in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ADAP pays $1,740 per month as the base benefit starting July 1, 2026. The first $700 per month of employment income is fully exempt and does not reduce the benefit. Above $700 per month, the benefit reduces by 50 cents per dollar earned. Albertans can earn up to approximately $45,000 per year and still receive some ADAP payment.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between ADAP and AISH in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ADAP pays $1,740 per month and is for Albertans with a severe disability who are assessed as able to work to some degree. AISH pays $1,940 per month and is for Albertans who are permanently unable to work. At zero employment income, AISH pays $200 more per month than ADAP. The gap can grow larger as income rises because ADAP's income exemption ($700/month) is lower than AISH's ($1,072/month), meaning ADAP reduces faster. Albertans apply once — the government places them in the right program based on their medical assessment.",
      },
    },
    {
      "@type": "Question",
      name: "Can I work while receiving ADAP in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ADAP is specifically designed for Albertans with disabilities who can work to some degree. The first $700 per month of employment income is fully exempt and does not reduce the ADAP benefit. Above $700, the benefit decreases by 50 cents per dollar. Alberta has described ADAP as having the highest employment income limit of any comparable disability program in Canada.",
      },
    },
    {
      "@type": "Question",
      name: "How do I apply for ADAP in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Albertans apply for ADAP and AISH through a single combined application with Alberta Supports. The government reviews your medical assessment and financial situation to determine which program — ADAP or AISH — you qualify for. Current AISH clients will be transitioned as ADAP launches on July 1, 2026.",
      },
    },
    {
      "@type": "Question",
      name: "Why does the difference between ADAP and AISH grow with income?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "At zero income, the gap is always $200 per month ($1,940 AISH minus $1,740 ADAP). As employment income increases, ADAP reduces faster than AISH because ADAP's income exemption is $700/month while AISH's is $1,072/month. For every dollar you earn above $700, ADAP starts reducing — but AISH does not start reducing until you earn above $1,072. This means the gap between the two programs widens between $700 and $1,072 of monthly income.",
      },
    },
    {
      "@type": "Question",
      name: "What happens to current AISH clients when ADAP launches in July 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Current AISH clients will continue receiving their existing AISH payments. The Alberta government has confirmed a $200 per month transition bridge to help existing AISH clients maintain their $1,940 per month until at least December 31, 2027, while the new system is implemented. New applicants from July 2026 onward will be assessed for either ADAP or AISH.",
      },
    },
    {
      "@type": "Question",
      name: "Is the ADAP benefit taxable income?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta disability benefits including ADAP are generally not subject to income tax. Employment income earned while receiving ADAP may still be taxable depending on your total annual income and applicable credits. Always confirm your specific situation with a tax professional or Alberta Supports.",
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ADAPCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <ADAPCalculatorClient />
    </>
  )
}
