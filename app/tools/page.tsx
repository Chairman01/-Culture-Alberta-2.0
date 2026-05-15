import Link from "next/link"
import Image from "next/image"
import { Calculator, DollarSign, Calendar, ArrowRight, Wrench } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Alberta Tools & Calculators | Free for Albertans | Culture Alberta",
  description:
    "Free tools and calculators built for Albertans. Calculate AISH payments, damage deposits, stat holiday pay, and more. No sign-up required.",
  keywords: "Alberta calculators, AISH calculator Alberta, Alberta government tools, damage deposit calculator Alberta, stat holiday pay Alberta, Alberta benefits calculator, free tools Alberta",
  alternates: {
    canonical: "https://www.culturealberta.com/tools",
  },
  openGraph: {
    title: "Alberta Tools & Calculators | Free for Albertans | Culture Alberta",
    description:
      "Free tools and calculators for Albertans. AISH payment calculator, damage deposit calculator, and more. No sign-up required.",
    url: "https://www.culturealberta.com/tools",
    siteName: "Culture Alberta",
    locale: "en_CA",
    type: "website",
    images: [{ url: "https://www.culturealberta.com/images/culture-alberta-og.jpg", width: 1200, height: 630, alt: "Alberta Tools & Calculators — Culture Alberta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Tools & Calculators | Free for Albertans",
    description: "Free calculators and tools for Albertans. AISH payment calculator and more.",
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
}

const tools = [
  {
    href: "/tools/aish-calculator",
    icon: DollarSign,
    title: "AISH Calculator Alberta",
    description:
      "Estimate Assured Income for the Severely Handicapped payments using 2026 Alberta rates, including child benefits, employment income exemptions, and clawbacks.",
    badge: "New",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    href: "#",
    icon: Calculator,
    title: "Alberta Damage Deposit Calculator",
    description:
      "Quickly calculate the maximum damage deposit a landlord can charge under the Residential Tenancies Act, based on your monthly rent.",
    badge: "Coming Soon",
    badgeColor: "bg-gray-100 text-gray-500",
    disabled: true,
  },
  {
    href: "#",
    icon: Calendar,
    title: "Alberta Stat Holiday Pay Calculator",
    description:
      "Find out what you're owed for statutory holiday pay under Alberta's Employment Standards Code — whether you worked the holiday or not.",
    badge: "Coming Soon",
    badgeColor: "bg-gray-100 text-gray-500",
    disabled: true,
  },
]

const toolsPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Alberta Tools & Calculators",
  "description": "Free tools and calculators built for Albertans. AISH payment calculator, damage deposit calculator, and more.",
  "url": "https://www.culturealberta.com/tools",
  "isPartOf": { "@type": "WebSite", "name": "Culture Alberta", "url": "https://www.culturealberta.com" },
  "publisher": { "@type": "Organization", "name": "Culture Alberta", "url": "https://www.culturealberta.com" },
  "about": { "@type": "AdministrativeArea", "name": "Alberta", "containedInPlace": { "@type": "Country", "name": "Canada" } }
}

const toolsBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.culturealberta.com" },
    { "@type": "ListItem", "position": 2, "name": "Alberta Tools", "item": "https://www.culturealberta.com/tools" }
  ]
}

export default function ToolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsBreadcrumb) }} />
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-6 text-gray-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Alberta Tools
            </h1>
            <p className="max-w-2xl text-lg text-gray-600 leading-relaxed">
              Free calculators and reference tools built specifically for Albertans. No sign-up
              required — just straightforward answers.
            </p>
          </div>
        </div>
      </header>

      {/* Tools Grid */}
      <main className="container mx-auto px-4 max-w-5xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AISH Calculator — featured card with logo */}
          <Link href="/tools/aish-calculator" className="group block h-full">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer">
              {/* Logo banner */}
              <div className="relative h-[72px] bg-white border-b border-gray-100">
                <Image
                  src="/images/aish-logo.svg"
                  alt="AISH – Assured Income for the Severely Handicapped"
                  fill
                  className="object-contain object-left px-5 py-2"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${tools[0].badgeColor}`}>
                    {tools[0].badge}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{tools[0].title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{tools[0].description}</p>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Base rate</p>
                    <p className="text-base font-bold text-gray-900">$1,940/mo</p>
                  </div>
                  <div className="w-px h-7 bg-gray-100" />
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">1st child</p>
                    <p className="text-base font-bold text-gray-900">+$232/mo</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-sm font-medium text-emerald-700 group-hover:gap-2 transition-all">
                    Open Calculator
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Remaining tools (disabled / coming soon) */}
          {tools.slice(1).map((tool) => {
            const Icon = tool.icon
            const card = (
              <div
                className={`bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 h-full transition-shadow ${
                  tool.disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{tool.description}</p>
                </div>
              </div>
            )
            return <div key={tool.href + tool.title}>{card}</div>
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-12">
          All tools are for informational purposes only. Always verify figures with the relevant
          Alberta government program or a qualified professional.
        </p>
      </main>
    </div>
    </>
  )
}
