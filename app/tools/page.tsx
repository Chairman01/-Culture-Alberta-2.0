import Link from "next/link"
import { Calculator, DollarSign, Calendar, ArrowRight, Wrench } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Alberta Tools & Calculators | Culture Alberta",
  description:
    "Free tools and calculators for Albertans. Calculate AISH payments, damage deposits, stat holiday pay, and more.",
  openGraph: {
    title: "Alberta Tools & Calculators | Culture Alberta",
    description:
      "Free tools and calculators for Albertans. AISH payment calculator, damage deposit calculator, and more.",
    url: "https://www.culturealberta.com/tools",
  },
}

const tools = [
  {
    href: "/tools/aish-calculator",
    icon: DollarSign,
    title: "AISH Payment Calculator",
    description:
      "Calculate your monthly AISH benefit based on marital status, number of dependants, and employment income. See exactly how the clawback affects your payment.",
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

export default function ToolsPage() {
  return (
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
          {tools.map((tool) => {
            const Icon = tool.icon
            const card = (
              <div
                className={`bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4 h-full transition-shadow ${
                  tool.disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${tool.badgeColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{tool.description}</p>
                </div>
                {!tool.disabled && (
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                    Open Calculator
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            )

            return tool.disabled ? (
              <div key={tool.href + tool.title}>{card}</div>
            ) : (
              <Link key={tool.href} href={tool.href} className="group block h-full">
                {card}
              </Link>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-12">
          All tools are for informational purposes only. Always verify figures with the relevant
          Alberta government program or a qualified professional.
        </p>
      </main>
    </div>
  )
}
