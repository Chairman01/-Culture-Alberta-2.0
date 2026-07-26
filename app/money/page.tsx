import { Metadata } from 'next'
import { getMoneyArticlesWithFallback } from "@/lib/fallback-articles"
import SectionHub, { SectionHubArticle } from "@/components/section-hub"

export const metadata: Metadata = {
  title: 'Money in Alberta | Rebates, Benefits & Cost of Living | Culture Alberta',
  description: 'Alberta rebates, benefits, wages and cost-of-living help. How to apply for the energy rebate, AISH and CPP disability, minimum wage, tax credits and more.',
  keywords: 'Alberta rebate, Alberta energy rebate, AISH, CPP disability, Alberta minimum wage, cost of living Alberta, tax credit Alberta, Alberta benefits',
  alternates: { canonical: 'https://www.culturealberta.com/money' },
  openGraph: {
    title: 'Money in Alberta | Rebates, Benefits & Cost of Living',
    description: 'Alberta rebates, benefits, wages and cost-of-living help — explained plainly.',
    url: 'https://www.culturealberta.com/money',
    type: 'website',
  },
}

export const revalidate = 900 // 15 minutes

async function getMoneyData() {
  try {
    const raw = await getMoneyArticlesWithFallback()
    const processed: SectionHubArticle[] = raw.map(article => ({
      ...article,
      description: article.content,
      category: article.category || 'Money',
      date: article.date || article.createdAt || new Date().toISOString(),
      imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`,
    }))
    processed.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    return {
      featuredArticle: processed[0] || null,
      articles: processed.length > 1 ? processed.slice(1) : processed,
    }
  } catch (error) {
    console.error('❌ Error loading Money data:', error)
    return { featuredArticle: null, articles: [] }
  }
}

export default async function MoneyPage() {
  const { featuredArticle, articles } = await getMoneyData()
  return (
    <SectionHub
      title="Money"
      description="Rebates, benefits, wages and the cost of living in Alberta — what you qualify for, how to apply, and when you get paid."
      accent="green"
      featuredArticle={featuredArticle}
      articles={articles}
      newsletterTitle="Money in your inbox"
      newsletterDescription="Rebates, benefits and cost-of-living help for Albertans — the moment they're announced."
    />
  )
}
