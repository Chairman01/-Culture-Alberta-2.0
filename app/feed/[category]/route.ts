import { NextResponse } from "next/server"
import { buildRssFeed, FEED_CATEGORIES } from "@/lib/rss"

export const revalidate = 3600 // refresh hourly

// Per-city feeds, one per Flipboard magazine — Flipboard maps a single RSS feed
// to a single magazine, so /feed/calgary.xml fills the Calgary magazine and so on.
//
// The dynamic segment swallows any ".xml" suffix, so both /feed/calgary and
// /feed/calgary.xml work; the .xml form is what we hand to Flipboard because
// aggregator UIs tend to assume a feed looks like a file.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category: rawCategory } = await params
  const slug = rawCategory.replace(/\.xml$/, "").toLowerCase()

  const feed = FEED_CATEGORIES[slug]
  if (!feed) {
    return new NextResponse("Feed not found", { status: 404 })
  }

  return buildRssFeed({
    category: feed.category,
    title: feed.title,
    description: feed.description,
    selfUrl: `https://www.culturealberta.com/feed/${slug}.xml`,
  })
}
