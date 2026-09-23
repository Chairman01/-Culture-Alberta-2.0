import { Metadata } from 'next'
import { getNationalArticlesWithFallback } from "@/lib/fallback-articles"
import SectionHub, { SectionHubArticle } from "@/components/section-hub"
import { SectionStructuredData } from "@/components/seo/structured-data"
import { getArticleUrl } from "@/lib/utils/article-url"

export const metadata: Metadata = {
  title: 'Canada Stories for Albertans | National | Culture Alberta',
  description: 'Canada-wide stories that matter to Albertans: federal politics, the national economy, and stories from across the country, explained from an Alberta point of view.',
  keywords: 'Canada stories Alberta, federal government Alberta, Canadian politics, Canada economy',
  alternates: { canonical: 'https://www.culturealberta.com/national' },
  openGraph: {
    title: 'Canada Stories for Albertans | Culture Alberta',
    description: 'Canada-wide stories that matter to Albertans, explained from an Alberta point of view.',
    url: 'https://www.culturealberta.com/national',
    type: 'website',
  },
}

export const revalidate = 900 // 15 minutes

async function getNationalData() {
  try {
    const raw = await getNationalArticlesWithFallback()
    const processed: SectionHubArticle[] = raw.map(article => ({
      ...article,
      description: article.content,
      category: article.category || 'National',
      date: article.date || article.createdAt || new Date().toISOString(),
      imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`,
    }))
    processed.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    return {
      featuredArticle: processed[0] || null,
      articles: processed.length > 1 ? processed.slice(1) : processed,
    }
  } catch (error) {
    console.error('❌ Error loading National data:', error)
    return { featuredArticle: null, articles: [] }
  }
}

export default async function NationalPage() {
  const { featuredArticle, articles } = await getNationalData()
  const all = featuredArticle ? [featuredArticle, ...articles] : articles
  return (
    <>
    <SectionStructuredData
      name="National"
      description="Canada-wide stories that matter to Albertans: federal politics, the national economy, and stories from across the country."
      path="/national"
      articles={all.map(a => ({ title: a.title, url: getArticleUrl(a) }))}
    />
    <SectionHub
      title="National"
      description="Canada-wide stories that matter to Albertans — federal politics, the national economy, and stories from across the country."
      accent="red"
      featuredArticle={featuredArticle}
      articles={articles}
      newsletterTitle="Canada, from Alberta"
      newsletterDescription="The national stories that affect Albertans, in your inbox when they break."
    />
    </>
  )
}
