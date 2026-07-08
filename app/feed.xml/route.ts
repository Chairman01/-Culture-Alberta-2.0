import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const revalidate = 3600 // refresh hourly

const BASE_URL = "https://www.culturealberta.com"

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, excerpt, description, created_at, updated_at, image_url, category, author, tags")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50)

  const items = (articles ?? [])
    .map((a) => {
      const url = `${BASE_URL}/articles/${a.slug}`
      const pubDate = new Date(a.created_at).toUTCString()
      const description = a.excerpt || a.description || ""
      const category = a.category || "Culture"
      const imageUrl = a.image_url || `${BASE_URL}/images/culture-alberta-og.jpg`

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(category)}</category>
      ${a.author ? `<author>${escapeXml(a.author)}</author>` : ""}
      <media:content url="${escapeXml(imageUrl)}" medium="image" />
    </item>`
    })
    .join("\n")

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Culture Alberta</title>
    <link>${BASE_URL}</link>
    <description>Alberta events, culture, food, and local news covering Calgary, Edmonton, and communities across Alberta.</description>
    <language>en-ca</language>
    <managingEditor>hello@culturemedia.ca (Culture Alberta)</managingEditor>
    <webMaster>hello@culturemedia.ca (Culture Alberta)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/images/ca-logo.png</url>
      <title>Culture Alberta</title>
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
