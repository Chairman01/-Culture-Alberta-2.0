import type { Metadata } from "next"
import AISHCalculatorClient from "./aish-calculator-client"

export const metadata: Metadata = {
  title: "AISH Calculator Alberta 2026 | Estimate Your Monthly Payment Free",
  description:
    "Free AISH calculator for Alberta 2026. Instantly estimate your monthly AISH payment, child benefit, employment income exemption, clawback, and take-home income. Updated for 2026 Alberta rates — $1,940/month base.",
  keywords: [
    "AISH calculator Alberta",
    "AISH calculator 2026",
    "AISH payment calculator",
    "Alberta disability calculator",
    "AISH monthly payment 2026",
    "how much AISH will I get",
    "AISH income exemption calculator",
    "AISH clawback calculator",
    "Assured Income Severely Handicapped calculator",
    "Alberta disability benefit calculator",
    "AISH 1940 calculator",
    "disability income Alberta",
    "AISH payment estimate",
    "AISH child benefit calculator",
    "Alberta AISH 2026 amount",
    "can I work on AISH",
    "AISH employment exemption",
    "AISH vs CPP Disability Alberta",
    "Alberta disability support",
    "AISH family income exemption",
    "AISH Edmonton",
    "AISH Calgary",
    "Alberta income support calculator",
    "AISH $1940 per month",
    "Alberta assured income calculator free",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/aish-calculator",
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
    title: "AISH Calculator Alberta 2026 — Free Monthly Payment Estimator",
    description:
      "Calculate your estimated 2026 AISH monthly payment in seconds. Includes child benefits, single and family employment income exemptions, clawback, and total take-home income. Free and updated for current Alberta rates.",
    url: "https://www.culturealberta.com/tools/aish-calculator",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "AISH Calculator Alberta 2026 — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AISH Calculator Alberta 2026 — Free Monthly Payment Estimator",
    description:
      "Estimate your monthly AISH payment instantly using 2026 Alberta rates. Includes income exemptions, child benefits, and clawback.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AISH Calculator Alberta 2026",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/aish-calculator",
  description:
    "A free calculator for estimating Alberta AISH monthly payments using 2026 rates — including the $1,940 living allowance, child benefits, single and family employment income exemptions, clawback, and after-tax take-home income.",
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
  keywords: "AISH calculator, Alberta disability benefit, AISH 2026, AISH payment estimator, Assured Income Severely Handicapped",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".aish-key-facts"],
    xpath: ["/html/head/title"],
  },
  about: {
    "@type": "GovernmentService",
    name: "Assured Income for the Severely Handicapped (AISH)",
    description: "Alberta government program providing financial support to eligible adults with permanent medical conditions. Base rate: $1,940/month in 2026.",
    provider: {
      "@type": "GovernmentOrganization",
      name: "Government of Alberta",
      url: "https://www.alberta.ca",
    },
    areaServed: {
      "@type": "Province",
      name: "Alberta",
    },
  },
}

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
      name: "AISH Calculator",
      item: "https://www.culturealberta.com/tools/aish-calculator",
    },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much is AISH in Alberta in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The 2026 AISH standard living allowance is $1,940 per month for a single recipient before any income reductions. Additional child benefits may be added: $232/month for the first dependent child and $117/month for each additional child.",
      },
    },
    {
      "@type": "Question",
      name: "What is AISH in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH stands for Assured Income for the Severely Handicapped. It is an Alberta government program that provides financial and health benefits to eligible adult Albertans with a permanent medical condition that prevents them from earning a living.",
      },
    },
    {
      "@type": "Question",
      name: "Can I work while receiving AISH in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. AISH allows recipients to earn employment income up to a monthly exemption before it affects their payment. Single recipients have a full exemption of $1,072/month, with a maximum exemption of $1,541/month. Families have a full exemption of $2,612/month, with a maximum of $2,981/month. Income above the exemption reduces AISH at a 50-cent-per-dollar clawback rate.",
      },
    },
    {
      "@type": "Question",
      name: "Is AISH taxable income?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH living allowance payments are not taxable income. Employment income earned while on AISH is separate and may still be subject to federal and Alberta income tax, though many recipients earn below the basic personal amount threshold.",
      },
    },
    {
      "@type": "Question",
      name: "How is AISH calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH is calculated by starting with the base living allowance ($1,940/month in 2026) and adding any child benefits. Employment income is then assessed: the first $1,072/month (single) or $2,612/month (family) is fully exempt. Income above that reduces AISH by 50 cents per dollar until the maximum exemption cap is reached. Any income above the cap is deducted dollar-for-dollar.",
      },
    },
    {
      "@type": "Question",
      name: "Does being married or common-law affect AISH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Marriage or common-law status does not automatically change the standard AISH living allowance, but AISH uses family employment income exemption amounts and considers spouse or partner income in the assessment.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between AISH and CPP Disability in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH is an Alberta provincial program for Albertans with severe disabilities who meet income and asset limits. CPP Disability is a federal program based on your work history and contributions to the Canada Pension Plan. You may qualify for both, and receiving CPP Disability can reduce your AISH payment depending on the amount.",
      },
    },
    {
      "@type": "Question",
      name: "When are AISH payments deposited in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AISH payments are typically deposited on the last banking day of each month for the following month. For example, the January payment is deposited at the end of December. Check with Alberta Supports for the exact 2026 payment schedule.",
      },
    },
  ],
}

export default function AISHCalculatorPage() {
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
      <AISHCalculatorClient />
    </>
  )
}
