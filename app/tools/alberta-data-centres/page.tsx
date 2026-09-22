import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { ToolEngagement } from "@/components/tool-engagement"
import { ToolFaq } from "@/components/tool-faq"
import { DATA_CENTRES, ALBERTA_REFERENCE, LAST_REVIEWED, GLOSSARY, totals } from "@/lib/data/alberta-data-centres"
import { getTrackerData } from "@/lib/data-centres"
import DataCentresClient, { type RelatedArticle } from "./data-centres-client"

export const revalidate = 3600

const URL = "https://www.culturealberta.com/tools/alberta-data-centres"
const t = totals()
const gw = (t.proposedMW / 1000).toFixed(1)

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Alberta Data Centres Map & Tracker 2026 | Every Project, Power & Your Bill",
  description: `Interactive map of all ${t.total} Alberta data centre projects: Meta Sturgeon County, Wonder Valley, Beacon AI, Keephills and more. Power source, megawatts, status, water, jobs, and what it means for your electricity bill.`,
  keywords: [
    "Alberta data centres",
    "Alberta data centre map",
    "data centres in Alberta",
    "Alberta AI data centre",
    "Meta data centre Alberta",
    "Meta Sturgeon County data centre",
    "Wonder Valley data centre",
    "Beacon AI Alberta",
    "Keephills data centre",
    "Alberta data centre electricity bill",
    "will data centres raise power bills Alberta",
    "AESO data centre",
    "Alberta data centre regulation",
    "data centre Calgary",
    "data centre Edmonton",
    "Alberta data centre water",
    "Alberta data centre tracker",
    "how many data centres in Alberta",
  ].join(", "),
  alternates: { canonical: URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
  openGraph: {
    title: "Alberta Data Centres Map & Tracker 2026",
    description: `${t.total} projects, ${gw} GW of proposed demand, one map. See where every Alberta data centre is, who is powering it, and what it could do to your bill.`,
    url: URL,
    siteName: "Culture Alberta",
    locale: "en_CA",
    type: "website",
    images: [{ url: "https://www.culturealberta.com/images/culture-alberta-og.jpg", width: 1200, height: 630, alt: "Alberta Data Centre Tracker — Culture Alberta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberta Data Centres Map & Tracker 2026",
    description: `Every Alberta data centre project on one map, with power source, megawatts and the bill-impact debate explained.`,
    site: "@culturealberta",
    images: ["https://www.culturealberta.com/images/culture-alberta-og.jpg"],
  },
  other: {
    "geo.region": "CA-AB",
    "geo.placename": "Alberta, Canada",
    "DC.title": "Alberta Data Centre Tracker 2026",
    "DC.coverage": "Alberta, Canada",
    "DC.language": "en-CA",
  },
}

// ---------------------------------------------------------------------------
// Structured data — the FAQ text is rendered on-page by ToolFaq so the
// visible content and the JSON-LD match.
// ---------------------------------------------------------------------------
const faq = [
  {
    q: "How many data centres are there in Alberta?",
    a: `Culture Alberta tracks ${t.total} data centre projects in Alberta as of ${LAST_REVIEWED}: ${t.operating} operating sites (mostly small colocation and bitcoin facilities totalling about ${Math.round(t.operatingMW)} MW) and ${t.active} projects proposed, approved or under construction. The proposed projects with a published figure add up to roughly ${gw} GW of new demand, more than Alberta's all-time record peak of ${ALBERTA_REFERENCE.recordPeakMW.toLocaleString("en-CA")} MW.`,
  },
  {
    q: "Where is the Meta data centre in Alberta?",
    a: "Meta's $13-billion, 1 GW AI data centre is in Sturgeon County, northeast of Edmonton in Alberta's Industrial Heartland. Meta reached its final investment decision on July 8, 2026. It holds a 970 MW AESO load contract, will be powered by the 932 MW Greenlight Electricity Centre gas plant plus a 250 MW Capital Power agreement, and expects about 3,000 construction jobs and 300 permanent jobs.",
  },
  {
    q: "Will data centres raise my electricity bill in Alberta?",
    a: `Possibly, during the gap between a data centre connecting and its own power plant coming online. The Pembina Institute estimates the Meta project alone puts an average household at risk of paying $${ALBERTA_REFERENCE.pembinaBillLow} to $${ALBERTA_REFERENCE.pembinaBillHigh} more per year from 2027 to 2031 through higher wholesale prices. The Government of Alberta disputes that framing, noting wholesale and retail prices differ and that Meta-funded grid upgrades could lower transmission charges by up to 6 percent. Customers on fixed-rate contracts are insulated until their contract renews.`,
  },
  {
    q: "What is Alberta's bring-your-own-power rule for data centres?",
    a: "Large data centres must supply their own generation rather than rely on the shared grid. Alberta's Data Centre Regulation, in force since June 2026, moves projects that pair new demand with new generation or storage to the front of the connection queue. The province has steered that generation toward natural gas; critics including the Pembina Institute argue renewables, storage and demand flexibility should be allowed to compete.",
  },
  {
    q: "What is Wonder Valley?",
    a: "Wonder Valley is a proposed 7.5 GW off-grid AI data centre park in the MD of Greenview near Grande Cache, led by Kevin O'Leary's O'Leary Ventures, with a headline figure of up to $70 billion in investment. As of September 2026 it is a phased land-and-power proposal listed in the Alberta Major Projects Inventory, with no announced anchor tenant or binding construction agreement.",
  },
  {
    q: "How much power has AESO actually approved for data centres?",
    a: "AESO allowed 1,200 MW of data centre load onto the grid under its Phase 1 interim limit, fully allocated to two projects: Meta's Sturgeon County campus (970 MW) and TransAlta's Keephills Data Centre Phase I (230 MW), both targeting 2027–28. Companies had asked to connect roughly 19,565 MW. Phase 2, the long-term framework for large loads, is still being developed.",
  },
  {
    q: "How much water do Alberta data centres use?",
    a: "It depends on the cooling design, and most proposals have not published a figure. Meta says its Sturgeon County site uses closed-loop liquid cooling with no operational water use for cooling and less water annually than a typical Alberta golf course. All water use in Alberta requires a Water Act licence; new licences are the most junior in a basin and are restricted first in a shortage, and southern Alberta's river basins have been closed to new surface-water licences since 2006.",
  },
  {
    q: "How many jobs do data centres create in Alberta?",
    a: "Construction jobs are large but temporary; permanent jobs are few relative to the investment. Meta projects about 3,000 construction workers at peak and 300 permanent positions for its $13-billion site. Research cited by the Pembina Institute finds most data centres create 30 to 50 permanent jobs, with the largest reaching around 200. Alberta has not required community-benefit agreements or local-hiring commitments.",
  },
]

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
}

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Alberta Data Centre Tracker",
  description: `A curated dataset of ${t.total} proposed, approved, under-construction and operating data centre projects in Alberta, with location, status, electrical demand, power source, workload and sources.`,
  url: URL,
  dateModified: LAST_REVIEWED,
  creator: { "@type": "Organization", name: "Culture Alberta", url: "https://www.culturealberta.com" },
  spatialCoverage: { "@type": "Place", name: "Alberta, Canada" },
  keywords: ["data centres", "Alberta", "AESO", "electricity", "AI"],
  isBasedOn: [
    { "@type": "CreativeWork", name: "AESO Large Load Projects", url: "https://www.aeso.ca/grid/connecting-to-the-grid/large-load-projects/" },
    { "@type": "CreativeWork", name: "Government of Alberta — AI Data Centres", url: "https://www.alberta.ca/datacentres/index.html" },
  ],
}

const glossarySchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": `${URL}#glossary`,
  name: "Alberta data centre glossary",
  hasDefinedTerm: GLOSSARY.map(g => ({
    "@type": "DefinedTerm",
    "@id": `${URL}#${g.id}`,
    name: g.term,
    description: g.long,
    inDefinedTermSet: `${URL}#glossary`,
  })),
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.culturealberta.com" },
    { "@type": "ListItem", position: 2, name: "Alberta Tools", item: "https://www.culturealberta.com/tools" },
    { "@type": "ListItem", position: 3, name: "Alberta Data Centres", item: URL },
  ],
}

// Projects as Place entities so the individual campuses can surface in
// entity search ("Beacon Indus data centre") without a page each.
const placesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Alberta data centre projects",
  numberOfItems: DATA_CENTRES.length,
  itemListElement: DATA_CENTRES.map((dc, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${URL}/${dc.id}`,
    item: {
      "@type": "Place",
      "@id": `${URL}/${dc.id}#place`,
      url: `${URL}/${dc.id}`,
      name: dc.name,
      description: dc.summary,
      geo: { "@type": "GeoCoordinates", latitude: dc.lat, longitude: dc.lng },
      address: { "@type": "PostalAddress", addressLocality: dc.municipality, addressRegion: "AB", addressCountry: "CA" },
    },
  })),
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AlbertaDataCentresPage() {
  const tracker = await getTrackerData()
  let articles: RelatedArticle[] = []
  try {
    const { data } = await supabase
      .from("articles")
      .select("slug, title, image_url, created_at")
      .eq("status", "published")
      .or("title.ilike.%data centre%,title.ilike.%data center%,title.ilike.%wonder valley%")
      .order("created_at", { ascending: false })
      .limit(6)
    articles = (data ?? [])
      .filter(a => a.slug)
      .map(a => ({ slug: a.slug, title: a.title, imageUrl: a.image_url ?? null, createdAt: a.created_at }))
  } catch {
    // Coverage strip is optional; the tool renders without it.
  }

  return (
    <>
      {[datasetSchema, breadcrumbSchema, faqSchema, placesSchema, glossarySchema].map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <div data-tool-root>
        <DataCentresClient
          items={tracker.items}
          recentUpdates={tracker.recentUpdates}
          lastReviewed={tracker.lastReviewed}
          inventoryFetchedAt={tracker.inventoryFetchedAt}
          articles={articles}
        />
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <ToolFaq title="Alberta data centres — frequently asked questions" items={faq} />
          <ToolEngagement toolSlug="alberta-data-centres" />
        </div>
      </div>
    </>
  )
}
