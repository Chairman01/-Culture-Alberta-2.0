import type { Metadata } from "next"
import AlbertaPropertyTaxCalculatorClient from "./alberta-property-tax-calculator-client"
import { ToolEngagement } from "@/components/tool-engagement"

export const metadata: Metadata = {
  title: "Alberta Property Tax Calculator 2024 | All Municipalities | Free",
  description:
    "Free Alberta property tax calculator. Estimate your annual property tax for Calgary, Edmonton, Red Deer, Lethbridge, and 32 more Alberta municipalities. Compare mill rates city-by-city and see exactly how your tax bill breaks down.",
  keywords: [
    "Alberta property tax calculator",
    "property tax calculator Alberta 2024",
    "Calgary property tax calculator",
    "Edmonton property tax calculator",
    "Alberta mill rate 2024",
    "Alberta property tax estimate",
    "how is property tax calculated Alberta",
    "Alberta municipality tax rates",
    "Red Deer property tax",
    "Lethbridge property tax calculator",
    "Grande Prairie property tax",
    "Alberta education property tax",
    "mill rate Alberta city comparison",
    "residential property tax Alberta",
    "non-residential property tax Alberta",
    "property tax by city Alberta",
    "lowest property tax Alberta",
    "highest property tax Alberta",
    "Alberta assessment property tax",
    "property tax Alberta newcomers",
    "Alberta real estate tax calculator",
    "how much is property tax in Alberta",
    "municipal tax Alberta calculator",
    "provincial education requisition Alberta",
    "Alberta property tax appeal",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/alberta-property-tax-calculator",
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
    title: "Alberta Property Tax Calculator 2024 — Free City-by-City Comparison",
    description:
      "Calculate your estimated property tax for any Alberta municipality. Compare mill rates across 37 cities — Calgary, Edmonton, Red Deer, Lethbridge, Canmore, and more. See the municipal vs education tax breakdown instantly.",
    url: "https://www.culturealberta.com/tools/alberta-property-tax-calculator",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Alberta Property Tax Calculator — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Property Tax Calculator 2024 — Free City-by-City Comparison",
    description:
      "Estimate property taxes for Calgary, Edmonton, Red Deer, Lethbridge, and 33 more Alberta cities. Compare mill rates and see how your bill breaks down.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Property Tax Calculator 2024",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/alberta-property-tax-calculator",
  description:
    "A free calculator for estimating annual residential or non-residential property tax for any Alberta municipality. Covers 37 cities and towns using 2024 mill rates. Includes municipal and provincial education portions, city-by-city comparison table, and full explanation of how Alberta property taxes are calculated.",
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
    "Alberta property tax calculator, mill rate Alberta, property tax by city Alberta, Calgary property tax, Edmonton property tax, Alberta assessment",
  featureList: [
    "Select from 37 Alberta municipalities",
    "Residential and non-residential property types",
    "Municipal vs education tax breakdown",
    "City-by-city sortable comparison table",
    "Estimated tax on average home price per municipality",
    "Slider and manual assessed value input",
  ],
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
      name: "Alberta Property Tax Calculator",
      item: "https://www.culturealberta.com/tools/alberta-property-tax-calculator",
    },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is property tax calculated in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alberta property tax is calculated using the formula: Property Tax = (Assessed Value ÷ 1,000) × Total Mill Rate. The total mill rate has two components: the municipal rate (set by your city or town council) and the provincial education rate (set by the Government of Alberta). For example, a $450,000 home in Calgary with a total mill rate of 9.27 would owe approximately $4,172 per year.",
      },
    },
    {
      "@type": "Question",
      name: "What is a mill rate in Alberta property tax?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A mill rate is the amount of tax payable per $1,000 of assessed property value. The word 'mill' comes from the Latin 'mille' meaning one thousand. Alberta municipalities set their own mill rates each spring as part of the annual budget process. A mill rate of 10.00 means you pay $10 for every $1,000 your property is assessed at.",
      },
    },
    {
      "@type": "Question",
      name: "Why does Calgary have a lower property tax rate than Edmonton?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Calgary's lower residential mill rate is largely due to its stronger commercial and industrial tax base. Downtown office towers, major retail centres, and industrial properties pay non-residential rates (typically 2–3× residential). This commercial tax base effectively subsidizes residential ratepayers. Edmonton has a higher residential mill rate because its commercial assessment base is proportionally smaller relative to its population and service costs.",
      },
    },
    {
      "@type": "Question",
      name: "What Alberta city has the lowest property tax?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Among major Alberta cities and towns, Canmore typically has the lowest residential mill rate (approximately 6.89 total), followed by Airdrie and Chestermere. However, these municipalities also have higher average home prices, so your actual tax bill depends on your assessed value. For large cities, Calgary has the lowest mill rate among the major urban centres.",
      },
    },
    {
      "@type": "Question",
      name: "When is property tax due in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most Alberta municipalities have a property tax deadline in late June or early July. Calgary and Edmonton both use a June 30 deadline. Many municipalities offer monthly tax installment payment plans (TIPP) to spread the cost across the year. Late payments typically incur a penalty of 1.25%–2% per month.",
      },
    },
    {
      "@type": "Question",
      name: "Can I dispute my property assessment in Alberta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. If you believe your assessed value is too high, you can file a formal complaint with your municipality's Assessment Review Board (ARB). The deadline is typically in March or April. You can first request an informal review. To support your case, gather comparable sales data from July 1 of the prior year (the assessment date). A successful appeal reduces your assessed value and therefore your tax bill.",
      },
    },
    {
      "@type": "Question",
      name: "Does Alberta have a property tax deferral program for seniors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Alberta's Property Tax Deferral Program allows eligible homeowners aged 65 or older to defer all or part of their annual property taxes until they sell their home. The deferred amount accrues interest at the prime lending rate. Applicants must have lived in their home for at least one year and meet income requirements. Contact your municipality or Service Alberta for eligibility details.",
      },
    },
    {
      "@type": "Question",
      name: "Why do small northern Alberta towns have such high property tax rates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Remote northern municipalities face a combination of high service costs and a small assessment base. They must fund roads, utilities, emergency services, and administration for a smaller population. With fewer properties to distribute costs across, each property must carry a larger share. Additionally, remote communities often face higher construction and maintenance costs due to distance from supply chains and harsh climate conditions.",
      },
    },
  ],
}

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How Property Taxes Are Calculated in Alberta — City-by-City Comparison",
  description:
    "A complete guide to how Alberta property tax works: mill rates explained, municipal vs education portions, why Calgary has lower rates than Edmonton, how to dispute your assessment, and a full city-by-city mill rate comparison table.",
  url: "https://www.culturealberta.com/tools/alberta-property-tax-calculator",
  publisher: {
    "@type": "Organization",
    name: "Culture Alberta",
    url: "https://www.culturealberta.com",
  },
  author: {
    "@type": "Organization",
    name: "Culture Alberta",
  },
  about: {
    "@type": "AdministrativeArea",
    name: "Alberta",
    containedInPlace: { "@type": "Country", name: "Canada" },
  },
  keywords:
    "Alberta property tax, mill rate, property tax calculator, Calgary Edmonton property tax comparison, Alberta assessment",
  inLanguage: "en-CA",
}

export default function AlbertaPropertyTaxCalculatorPage() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div data-tool-root>
        <AlbertaPropertyTaxCalculatorClient />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="alberta-property-tax-calculator" />
        </div>
      </div>
    </>
  )
}
