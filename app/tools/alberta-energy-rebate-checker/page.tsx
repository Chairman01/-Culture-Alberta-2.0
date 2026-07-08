import type { Metadata } from "next"
import EnergyRebateCheckerClient from "./energy-rebate-checker-client"
import { ToolEngagement } from "@/components/tool-engagement"

export const metadata: Metadata = {
  title: "Alberta Energy Rebate Eligibility Checker | Do You Qualify + How to Apply",
  description:
    "Check if you qualify for the $100 Alberta Energy Rebate in 30 seconds — the same six questions the official application asks. Applications close September 30, 2026. Includes the full step-by-step walkthrough: Alberta.ca Account setup, supported banks, documents you need, and when you get paid.",
  keywords: [
    "alberta energy rebate eligibility",
    "do I qualify for alberta energy rebate",
    "how to apply for alberta energy rebate",
    "alberta energy rebate application",
    "alberta energy rebate checker",
    "alberta $100 rebate application",
    "alberta 100 dollar rebate how to apply",
    "energyrebate.alberta.ca",
    "alberta energy rebate portal",
    "alberta.ca account energy rebate",
    "alberta energy rebate income limit",
    "alberta energy rebate $225,000",
    "alberta energy rebate notice of assessment",
    "alberta energy rebate SIN",
    "alberta energy rebate ATB verification",
    "alberta energy rebate when do I get paid",
    "alberta energy rebate application status",
    "alberta energy rebate application rejected",
    "alberta rebate application 2026",
    "alberta energy rebate documents needed",
  ].join(", "),
  alternates: {
    canonical: "https://www.culturealberta.com/tools/alberta-energy-rebate-checker",
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
    title: "Alberta Energy Rebate Eligibility Checker — Do You Qualify for the $100 Rebate?",
    description:
      "Answer six quick questions to see if you qualify for the $100 Alberta Energy Rebate, then follow the step-by-step application walkthrough — Alberta.ca Account, supported banks, documents, and payment timing.",
    url: "https://www.culturealberta.com/tools/alberta-energy-rebate-checker",
    siteName: "Culture Alberta",
    type: "website",
    locale: "en_CA",
    images: [
      {
        url: "https://www.culturealberta.com/images/culture-alberta-og.jpg",
        width: 1200,
        height: 630,
        alt: "Alberta Energy Rebate Eligibility Checker — Culture Alberta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Energy Rebate Eligibility Checker — Do You Qualify?",
    description:
      "Six quick questions to see if you qualify for the $100 Alberta Energy Rebate, plus the full application walkthrough and payment timing.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

// ---------------------------------------------------------------------------
// Structured data — WebApplication (eligibility checker)
// ---------------------------------------------------------------------------
const checkerSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Alberta Energy Rebate Eligibility Checker",
  alternateName: "Alberta $100 Energy Rebate Qualification Tool",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  url: "https://www.culturealberta.com/tools/alberta-energy-rebate-checker",
  description:
    "A free tool that checks eligibility for the $100 Alberta Energy Rebate using the same six questions as the official application — Alberta residency, age 18+ on July 1 2026, 2025 Notice of Assessment issued, income of $225,000 or less, marital status, and verified Alberta.ca Account — then walks through the full application step by step.",
  featureList: [
    "Six-question eligibility check mirroring the official application",
    "Personalized result: apply now, wait for your NOA, or set up your Alberta.ca Account first",
    "Before-you-apply document checklist (SIN, spouse details, verified account)",
    "Alberta.ca Account setup guide with Interac-supported bank list",
    "ATB Financial and Servus Credit Union verification warning",
    "Step-by-step application walkthrough for energyrebate.alberta.ca",
    "Application status and payment timing explained",
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
    containedInPlace: { "@type": "Country", name: "Canada" },
  },
  keywords:
    "Alberta Energy Rebate eligibility, $100 Alberta rebate, how to apply Alberta energy rebate, energyrebate.alberta.ca, Alberta.ca account, Alberta energy rebate income limit",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".energy-rebate-key-facts"],
    xpath: ["/html/head/title"],
  },
  about: {
    "@type": "GovernmentService",
    name: "Alberta Energy Rebate",
    description:
      "A $100 payment from the Government of Alberta for Alberta residents who were 18 or older on July 1, 2026 and whose 2025 income tax return reported income of $225,000 or less. Applications are made online at energyrebate.alberta.ca with a verified Alberta.ca Account, and income is verified with the Canada Revenue Agency.",
    provider: {
      "@type": "GovernmentOrganization",
      name: "Government of Alberta",
      url: "https://www.alberta.ca",
    },
    areaServed: { "@type": "Province", name: "Alberta" },
  },
}

// ---------------------------------------------------------------------------
// Structured data — HowTo (application walkthrough)
// ---------------------------------------------------------------------------
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Apply for the Alberta Energy Rebate",
  description:
    "The full official application flow for the $100 Alberta Energy Rebate — from your 2025 Notice of Assessment to payment in your account.",
  totalTime: "PT15M",
  estimatedCost: { "@type": "MonetaryAmount", currency: "CAD", value: "0" },
  supply: [
    { "@type": "HowToSupply", name: "Verified Alberta.ca Account" },
    { "@type": "HowToSupply", name: "Social Insurance Number (SIN)" },
    { "@type": "HowToSupply", name: "2025 Notice of Assessment (issued by CRA)" },
    { "@type": "HowToSupply", name: "Spouse or partner's legal name, date of birth, and SIN (if married or common-law on the 2025 return)" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Make sure your 2025 Notice of Assessment has been issued",
      text: "File your 2025 tax return and wait for the CRA to issue your Notice of Assessment. If the NOA has not been issued, the government cannot verify your income and the application will be rejected.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Create and verify your Alberta.ca Account",
      text: "Create an Alberta.ca Account and complete identity verification. The fastest option is the Interac verification service through your online banking — supported banks include BMO, CIBC, Desjardins, First West, Libro, National Bank, Prospera, RBC, Scotiabank, and TD. ATB Financial and Servus are not supported by Interac verification, so use an alternate verification option if you bank there.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Go to energyrebate.alberta.ca and press Apply now",
      text: "Sign in with your verified Alberta.ca Account and start the application. Progress saves automatically, and you can resume later with the Resume application button.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Answer the eligibility questions",
      text: "Confirm you reside in Alberta, were 18 or older on July 1 2026, have received your 2025 Notice of Assessment, report your 2025 marital status, and that your 2025 income was $225,000 or less.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Enter your SIN and any spouse details",
      text: "Provide your Social Insurance Number and consent to income verification with the Canada Revenue Agency. If you reported married or common-law on your 2025 return, enter your spouse or partner's legal name, date of birth, and SIN as reported.",
    },
    {
      "@type": "HowToStep",
      position: 6,
      name: "Submit and save your Application Code",
      text: "After submitting, you receive a confirmation email with an Application Code and your payment date. Check your application status any time at energyrebate.alberta.ca.",
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
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    { "@type": "ListItem", position: 3, name: "Alberta Energy Rebate Checker", item: "https://www.culturealberta.com/tools/alberta-energy-rebate-checker" },
  ],
}

// ---------------------------------------------------------------------------
// Structured data — FAQPage (mirrors the visible FAQ section)
// ---------------------------------------------------------------------------
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who qualifies for the Alberta Energy Rebate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You qualify if you currently live in Alberta, were 18 or older on July 1, 2026, your 2025 Notice of Assessment has been issued by the CRA, and your income on your 2025 tax return was $225,000 or less. Applications are made online at energyrebate.alberta.ca with a verified Alberta.ca Account.",
      },
    },
    {
      "@type": "Question",
      name: "What do I need to apply for the Alberta Energy Rebate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three things: a verified Alberta.ca Account, your Social Insurance Number (SIN), and — if you reported your marital status as married or common-law on your 2025 income tax return — your spouse or common-law partner's legal name, date of birth, and SIN as reported on that return. The application saves automatically so you can resume it later.",
      },
    },
    {
      "@type": "Question",
      name: "What if I haven't received my 2025 Notice of Assessment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wait before applying. The official application warns that if your 2025 Notice of Assessment has not been issued, your income tax information cannot be verified and your application will be rejected. File your 2025 tax return, wait for the CRA to issue your NOA, and then apply.",
      },
    },
    {
      "@type": "Question",
      name: "Can I verify my Alberta.ca Account with ATB or Servus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No — the Interac verification service used for bank-based identity verification supports BMO, CIBC, Desjardins, First West (Envision Financial, Valley First, Island Savings), Libro, National Bank, Prospera, RBC, Scotiabank, and TD Canada Trust, but not ATB Financial or Servus Credit Union. If your bank is not supported, use one of the other identity verification options offered during Alberta.ca Account setup.",
      },
    },
    {
      "@type": "Question",
      name: "What is the deadline to apply for the Alberta Energy Rebate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Applications close September 30, 2026. The portal opened July 1, 2026, and there is no late claim — if you miss the window, you don't get the $100. If you're waiting on your 2025 Notice of Assessment, file your taxes as soon as possible so your NOA arrives before the deadline.",
      },
    },
    {
      "@type": "Question",
      name: "When do I get the Alberta Energy Rebate payment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your confirmation email states your exact payment date. If your application is approved, you receive your payment by that date — applications submitted in early July 2026 showed payment dates roughly one to two weeks after applying.",
      },
    },
    {
      "@type": "Question",
      name: "How do I check my Alberta Energy Rebate application status?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sign in at energyrebate.alberta.ca with your Alberta.ca Account at any time to view your application status, your Application Code, and the consent you provided for income verification with the Canada Revenue Agency. Your Application Code is also included in your confirmation email.",
      },
    },
    {
      "@type": "Question",
      name: "Can I save my Alberta Energy Rebate application and finish it later?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The application is automatically saved as you complete it. Return to energyrebate.alberta.ca, sign in, and choose Resume application to continue where you left off.",
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EnergyRebateCheckerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(checkerSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div data-tool-root>
        <EnergyRebateCheckerClient />
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <ToolEngagement toolSlug="alberta-energy-rebate-checker" />
        </div>
      </div>
    </>
  )
}
