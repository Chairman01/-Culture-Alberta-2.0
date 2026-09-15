import { Metadata } from 'next'
import Link from "next/link"
import Image from "next/image"
import { MapPin, Mail, Phone, ArrowRight, Sparkles, CalendarDays, Calculator, Briefcase, UtensilsCrossed, Award } from "lucide-react"
import NewsletterSignup from "@/components/newsletter-signup"

export const metadata: Metadata = {
  title: 'About Culture Alberta | Alberta\'s Local Culture Guide',
  description: 'Culture Alberta is Alberta\'s local culture hub — events, food and drink, neighbourhood guides and practical answers for Edmonton, Calgary and communities across the province. Published by Culture Media.',
  alternates: { canonical: 'https://www.culturealberta.com/about' },
  openGraph: {
    title: 'About Culture Alberta',
    description: 'Stay in the know about what\'s going on across Alberta and Canada — local events, food and drink, city guides and practical answers.',
    url: 'https://www.culturealberta.com/about',
    type: 'website',
  },
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": "https://www.culturealberta.com/#organization",
  "name": "Culture Alberta",
  "alternateName": "Culture Alberta Media",
  "url": "https://www.culturealberta.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.culturealberta.com/images/ca-logo.png",
  },
  "description": "Alberta's independent culture, events, and lifestyle guide covering Calgary, Edmonton, and communities across Alberta.",
  "foundingDate": "2024",
  "areaServed": {
    "@type": "State",
    "name": "Alberta",
    "containedInPlace": { "@type": "Country", "name": "Canada" },
  },
  "email": "hello@culturemedia.ca",
  "telephone": "+15878979347",
  // The publisher relationship, stated for crawlers as well as readers: Culture
  // Alberta is Culture Media's own title, not an unattributed site.
  "parentOrganization": {
    "@type": "Organization",
    "name": "Culture Media",
    "url": "https://www.culturemedia.ca",
  },
  "sameAs": [
    "https://www.instagram.com/culturealberta._",
    "https://www.youtube.com/@CultureAlberta_",
    "https://www.facebook.com/profile.php?id=100064044099295",
    "https://www.tiktok.com/@culturealberta",
    "https://twitter.com/culturealberta",
  ],
  "employee": [
    {
      "@type": "Person",
      // Kept for authorship/E-A-T even though no bio is rendered: search engines
      // weigh a named, accountable editor on a news organization. @id is an
      // opaque graph identifier and need not resolve; `url` is what a crawler
      // follows, so it points at the page itself rather than a removed anchor.
      "@id": "https://www.culturealberta.com/about#adam-harrison",
      "name": "Adam Harrison",
      "jobTitle": "Founder & Editor",
      "worksFor": {
        "@id": "https://www.culturealberta.com/#organization",
      },
      "url": "https://www.culturealberta.com/about",
      "description": "Alberta-based writer and founder of Culture Alberta, covering local events, food, culture, and community stories across Calgary, Edmonton, and Alberta.",
      "knowsAbout": [
        "Alberta culture",
        "Calgary events",
        "Edmonton events",
        "Alberta food and drink",
        "Alberta local culture",
        "AISH and Alberta social programs",
      ],
    },
  ],
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.culturealberta.com" },
    { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.culturealberta.com/about" },
  ],
}

/**
 * What the site actually publishes.
 *
 * Deliberately concrete and linked: the previous copy described a cultural
 * heritage archive, which is not what anyone arrives here for. Each card points
 * at a real section so the page ends in a click rather than a mission statement.
 *
 * Framed as a culture guide throughout, never as a news outlet — that is the
 * positioning, so the word is kept out of the visible copy.
 */
const WHAT_WE_DO = [
  {
    icon: Sparkles,
    title: "Stay in the know",
    body: "What's going on across Alberta and Canada — openings, changes and the things people here are actually talking about.",
    href: "/alberta",
    cta: "See what's new",
    accent: "text-blue-600",
    ring: "group-hover:border-blue-300",
  },
  {
    icon: CalendarDays,
    title: "Events worth your weekend",
    body: "A calendar drawn from Edmonton's and Calgary's own open data, plus the markets, festivals and one-offs we find ourselves.",
    href: "/events",
    cta: "See what's on",
    accent: "text-red-600",
    ring: "group-hover:border-red-300",
  },
  {
    icon: UtensilsCrossed,
    title: "Food and drink",
    body: "Where to eat, what just opened, and the places worth the drive — across Edmonton, Calgary and the communities in between.",
    href: "/food-drink",
    cta: "Find somewhere to eat",
    accent: "text-amber-600",
    ring: "group-hover:border-amber-300",
  },
  {
    icon: Award,
    title: "The best of Alberta",
    body: "Our picks for the things worth your time, gathered by city so you can find the good stuff without trawling reviews.",
    href: "/best-of",
    cta: "Browse the best of",
    accent: "text-rose-600",
    ring: "group-hover:border-rose-300",
  },
  {
    icon: Calculator,
    title: "Guides to how Alberta works",
    body: "Plain explanations and free calculators for AISH, ADAP, rebates, property tax and rent increases — the practical stuff that's hard to get straight answers on.",
    href: "/tools",
    cta: "Use the tools",
    accent: "text-emerald-700",
    ring: "group-hover:border-emerald-300",
  },
  {
    icon: Briefcase,
    title: "Alberta jobs",
    body: "Openings pulled straight from Alberta employers' own hiring boards, so the listing you click is the listing they posted.",
    href: "/jobs",
    cta: "Browse jobs",
    accent: "text-purple-600",
    ring: "group-hover:border-purple-300",
  },
]

/** The editions, in the order they are sized. Each has its own city page. */
const CITIES = [
  { name: "Edmonton", href: "/edmonton", color: "text-blue-600" },
  { name: "Calgary", href: "/calgary", color: "text-red-600" },
  { name: "Lethbridge", href: "/lethbridge", color: "text-amber-600" },
  { name: "Medicine Hat", href: "/medicine-hat", color: "text-orange-700" },
  { name: "Red Deer", href: "/red-deer", color: "text-rose-600" },
  { name: "Grande Prairie", href: "/grande-prairie", color: "text-green-700" },
  { name: "Fort McMurray", href: "/fort-mcmurray", color: "text-slate-700" },
  { name: "All of Alberta", href: "/alberta", color: "text-emerald-700" },
]

/** Real Culture Media clients — the same logos used on /partner. */
const CLIENT_LOGOS = [
  { name: "Moveology", src: "/images/clients/moveology.png" },
  { name: "Tutti Frutti", src: "/images/clients/tutti-frutti.png" },
  { name: "Neon YYC", src: "/images/clients/neon-yyc.png" },
  { name: "Pho City YYC", src: "/images/clients/pho-city-yyc.png" },
  { name: "TC Legal", src: "/images/clients/tc-legal.png" },
  { name: "Sport Calgary", src: "/images/clients/sport-calgary.png" },
  { name: "Gamecon Canada", src: "/images/clients/gamecon-canada.png" },
  { name: "Pekko Chicken", src: "/images/clients/pekko-chicken.png" },
  { name: "Tire Doctors", src: "/images/clients/tiredoctors.png" },
]

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="flex min-h-screen flex-col bg-white">
        <main className="flex-1">

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <section className="w-full bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
            <div className="container mx-auto px-4 md:px-6 py-14 md:py-20">
              <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 items-center">

                <div className="space-y-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    About Culture Alberta
                  </span>

                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-gray-900">
                    Alberta's
                    <span className="block text-blue-600">culture hub.</span>
                  </h1>

                  <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl">
                    Stay in the know about what's going on across Alberta and Canada — local events,
                    food and drink, city guides, and clear answers on the things that make life here
                    easier.
                  </p>

                  <p className="text-base text-gray-500 leading-relaxed max-w-xl">
                    One place for what's on this weekend, where to eat, what's worth doing in your
                    city, and how to get things done in Alberta.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/alberta"
                      className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                    >
                      Read the latest
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/events"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      What's on this week
                    </Link>
                  </div>
                </div>

                {/* The collage is shaped like the province, so it is given room to
                    breathe rather than cropped into a rectangle. */}
                <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                  <Image
                    src="/images/alberta-collage.png"
                    alt="A collage of photographs from across Alberta, arranged in the shape of the province"
                    width={683}
                    height={1024}
                    className="w-full h-auto"
                    priority
                  />
                </div>

              </div>
            </div>
          </section>

          {/* ── What we do ───────────────────────────────────────────────────── */}
          <section className="w-full py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  What you'll find here
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Everything worth knowing about life in Alberta, in one place.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {WHAT_WE_DO.map(({ icon: Icon, title, body, href, cta, accent, ring }) => (
                  <Link
                    key={title}
                    href={href}
                    className={`group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md ${ring}`}
                  >
                    <Icon className={`h-7 w-7 ${accent} mb-4`} />
                    <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 leading-relaxed flex-1">{body}</p>
                    <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${accent}`}>
                      {cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Where we cover ───────────────────────────────────────────────── */}
          <section className="w-full py-16 md:py-20 bg-gray-50 border-y border-gray-200">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Eight editions, one for each community
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  A festival in Lethbridge isn't much use to someone in Fort McMurray. Every community
                  gets its own page and its own newsletter, so what reaches you is what's near you.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {CITIES.map(({ name, href, color }) => (
                  <Link
                    key={name}
                    href={href}
                    className="group rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className={`font-display font-bold ${color}`}>{name}</span>
                    <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Culture Media ────────────────────────────────────────────────── */}
          <section className="w-full py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">

                <div className="space-y-5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Published by
                  </span>

                  <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Culture Alberta is a Culture Media title
                  </h2>

                  <p className="text-lg text-gray-600 leading-relaxed">
                    <a
                      href="https://www.culturemedia.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900"
                    >
                      Culture Media
                    </a>{' '}
                    is an Alberta digital agency — strategy, web and eCommerce, branding, social,
                    video and photography, SEO and lead generation. Culture Alberta is editorially
                    independent, funded by that work rather than by whoever we're writing about.
                  </p>

                  <p className="text-base text-gray-500 leading-relaxed">
                    That's also how local businesses reach Albertans here: through the site, the
                    newsletters and our social channels, clearly marked as partnerships.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/partner"
                      className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                    >
                      Partner with us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href="https://www.culturemedia.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      culturemedia.ca
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5">
                    Brands we've worked with
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {CLIENT_LOGOS.map(({ name, src }) => (
                      <div
                        key={name}
                        className="flex h-20 items-center justify-center rounded-xl border border-gray-200 bg-white p-3"
                      >
                        <Image
                          src={src}
                          alt={name}
                          width={120}
                          height={48}
                          /* Logos arrive at wildly different aspect ratios, so they
                             are contained rather than cropped, and desaturated so
                             nine of them read as one row instead of nine brands
                             competing with the page. */
                          className="max-h-full w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ── Contact ──────────────────────────────────────────────────────── */}
          <section className="w-full py-16 md:py-20 bg-gray-50 border-t border-gray-200">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Get in touch
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  A tip, a correction, an event we've missed, or an idea for working together — all
                  welcome, and read by a person.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <a
                  href="mailto:hello@culturemedia.ca"
                  className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-400 hover:shadow-sm"
                >
                  <Mail className="h-6 w-6 text-gray-400 mb-3 transition-colors group-hover:text-gray-900" />
                  <h3 className="font-display font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-sm text-gray-600 break-all">hello@culturemedia.ca</p>
                </a>

                <a
                  href="tel:+15878979347"
                  className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-400 hover:shadow-sm"
                >
                  <Phone className="h-6 w-6 text-gray-400 mb-3 transition-colors group-hover:text-gray-900" />
                  <h3 className="font-display font-bold text-gray-900 mb-1">Phone</h3>
                  <p className="text-sm text-gray-600">587-897-9347</p>
                </a>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <MapPin className="h-6 w-6 text-gray-400 mb-3" />
                  <h3 className="font-display font-bold text-gray-900 mb-1">Based in</h3>
                  <p className="text-sm text-gray-600">Alberta, Canada</p>
                </div>
              </div>

              {/* Social */}
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-500">Follow along</span>
                <a
                  href="https://www.instagram.com/culturealberta._/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://www.youtube.com/@CultureAlberta_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=100064044099295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
              </div>
            </div>
          </section>

          {/* ── Newsletter ───────────────────────────────────────────────────── */}
          {/* The real form, not a link to the homepage: the signup lives inline on
              "/" with no anchor to scroll to, so a /#newsletter link would just
              drop the reader at the top of the front page to hunt for it. */}
          <section className="w-full border-t border-gray-200 py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
                <div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight text-gray-900 mb-4">
                    Your city, in your inbox
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    One short email with what's worth knowing where you live — events, openings, and
                    the guides we've just published. Pick your community and we'll send that edition
                    only. Free, and one click to leave.
                  </p>
                </div>
                <NewsletterSignup
                  title="Get your edition"
                  description="Choose your community and we'll send what's happening near you."
                />
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  )
}
