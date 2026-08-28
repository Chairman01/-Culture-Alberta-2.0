import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSocialImageUrl } from "@/lib/social-image-url"

// ---------------------------------------------------------------------------
// Shared RSS builder.
//
// One feed per Flipboard magazine is the rule — Flipboard maps a single RSS
// feed to a single magazine, so the per-city magazines each need their own
// category feed. Everything is generated here so the image proxying and the
// dc:creator handling can't drift between /feed.xml and /feed/[category].
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.culturealberta.com"

// Feeds Flipboard can be pointed at. Keyed by URL slug → article category.
// Only categories that actually carry publishing volume are listed: a magazine
// fed by a near-empty category reads as abandoned and risks failing review.
export const FEED_CATEGORIES: Record<string, { category: string; title: string; description: string }> = {
  calgary: {
    category: "Calgary",
    title: "Culture Alberta — Calgary",
    description: "Calgary events, food, culture and local news from Culture Alberta.",
  },
  edmonton: {
    category: "Edmonton",
    title: "Culture Alberta — Edmonton",
    description: "Edmonton events, food, culture and local news from Culture Alberta.",
  },
  lethbridge: {
    category: "Lethbridge",
    title: "Culture Alberta — Lethbridge",
    description: "Lethbridge events, food, culture and local news from Culture Alberta.",
  },
  "grande-prairie": {
    category: "Grande Prairie",
    title: "Culture Alberta — Grande Prairie",
    description: "Grande Prairie events, food, culture and local news from Culture Alberta.",
  },
  "red-deer": {
    category: "Red Deer",
    title: "Culture Alberta — Red Deer",
    description: "Red Deer events, food, culture and local news from Culture Alberta.",
  },
  alberta: {
    category: "Alberta",
    title: "Culture Alberta — Alberta",
    description: "Province-wide Alberta events, food, culture and local news from Culture Alberta.",
  },
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

interface FeedOptions {
  /** Article category to filter on. Omitted = every published article. */
  category?: string
  title: string
  description: string
  /** Absolute URL of this feed, for the required atom:self link. */
  selfUrl: string
}

export async function buildRssFeed({
  category,
  title,
  description,
  selfUrl,
}: FeedOptions): Promise<NextResponse> {
  let query = supabase
    .from("articles")
    .select("slug, title, excerpt, description, created_at, updated_at, image_url, category, author, tags")
    .eq("status", "published")

  if (category) query = query.eq("category", category)

  const { data: articles } = await query.order("created_at", { ascending: false }).limit(50)

  const items = (articles ?? [])
    .map((a) => {
      const url = `${BASE_URL}/articles/${a.slug}`
      const pubDate = new Date(a.created_at).toUTCString()
      const itemDescription = a.excerpt || a.description || ""
      const itemCategory = a.category || "Culture"
      // Route through the og-image proxy: images live in Supabase Storage, which
      // sends an x-robots-tag that stops aggregator crawlers (Flipboard included)
      // from fetching them. Advertising the raw URL means an item with no image.
      const imageUrl = getSocialImageUrl(a.image_url)

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(itemDescription)}</description>
      <category>${escapeXml(itemCategory)}</category>
      ${a.author ? `<dc:creator>${escapeXml(a.author)}</dc:creator>` : ""}
      <media:content url="${escapeXml(imageUrl)}" medium="image" />
      <media:thumbnail url="${escapeXml(imageUrl)}" />
    </item>`
    })
    .join("\n")

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${BASE_URL}</link>
    <description>${escapeXml(description)}</description>
    <language>en-ca</language>
    <managingEditor>hello@culturemedia.ca (Culture Alberta)</managingEditor>
    <webMaster>hello@culturemedia.ca (Culture Alberta)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/images/ca-logo.png</url>
      <title>${escapeXml(title)}</title>
      <link>${BASE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
