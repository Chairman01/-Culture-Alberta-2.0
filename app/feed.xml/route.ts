import { buildRssFeed } from "@/lib/rss"

export const revalidate = 3600 // refresh hourly

// The site-wide feed: every published article, newest first. Advertised in
// layout.tsx and llms.txt, and the feed to point Flipboard's main magazine at.
export async function GET() {
  return buildRssFeed({
    title: "Culture Alberta",
    description:
      "Alberta events, culture, food, and local news covering Calgary, Edmonton, and communities across Alberta.",
    selfUrl: "https://www.culturealberta.com/feed.xml",
  })
}
