import { Metadata } from 'next'
import { getRetailArticlesWithFallback } from "@/lib/fallback-articles"
import SectionHub, { SectionHubArticle } from "@/components/section-hub"
import { SectionStructuredData } from "@/components/seo/structured-data"
import { getArticleUrl } from "@/lib/utils/article-url"

export const metadata: Metadata = {
  title: 'Retail in Alberta | Store Openings, Costco, Malls & Shopping | Culture Alberta',
  description: 'New store openings and shopping news across Alberta — Costco, Walmart, malls, big-box and retail chains. What is opening, where, and when.',
  keywords: 'Alberta store openings, new Costco Alberta, Alberta Walmart, West Edmonton Mall, Alberta shopping, retail Alberta, new stores Calgary Edmonton',
  alternates: { canonical: 'https://www.culturealberta.com/retail' },
  openGraph: {
    title: 'Retail in Alberta | Store Openings, Costco, Malls & Shopping',
    description: 'New store openings and shopping news across Alberta — what is opening, where, and when.',
    url: 'https://www.culturealberta.com/retail',
    type: 'website',
  },
}

export const revalidate = 900 // 15 minutes

async function getRetailData() {
  try {
    const raw = await getRetailArticlesWithFallback()
    const processed: SectionHubArticle[] = raw.map(article => ({
      ...article,
      description: article.content,
      category: article.category || 'Retail',
      date: article.date || article.createdAt || new Date().toISOString(),
      imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`,
    }))
    processed.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    return {
      featuredArticle: processed[0] || null,
      articles: processed.length > 1 ? processed.slice(1) : processed,
    }
  } catch (error) {
    console.error('❌ Error loading Retail data:', error)
    return { featuredArticle: null, articles: [] }
  }
}

export default async function RetailPage() {
  const { featuredArticle, articles } = await getRetailData()
  const all = featuredArticle ? [featuredArticle, ...articles] : articles
  return (
    <>
    <SectionStructuredData
      name="Retail"
      description="Store openings and shopping news across Alberta — new Costcos, big-box arrivals, malls and the chains coming to your city."
      path="/retail"
      articles={all.map(a => ({ title: a.title, url: getArticleUrl(a) }))}
    />
    <SectionHub
      title="Retail"
      description="Store openings and shopping news across Alberta — new Costcos, big-box arrivals, malls and the chains coming to your city."
      accent="purple"
      featuredArticle={featuredArticle}
      articles={articles}
      newsletterTitle="Never miss an opening"
      newsletterDescription="New stores, Costcos and shopping news across Alberta — straight to your inbox."
    />
    </>
  )
}
