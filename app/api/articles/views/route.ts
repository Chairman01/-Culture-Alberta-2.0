import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getArticleViewCountFromGA4 } from '@/lib/google-analytics'

async function getHistoricalViewCount(slug: string, databaseCount: number): Promise<number> {
  const ga4Count = await unstable_cache(
    () => getArticleViewCountFromGA4(slug),
    [`article-ga4-view-count-${slug}`],
    { revalidate: 21600 }
  )()
  return Math.max(databaseCount, ga4Count || 0)
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const shouldIncrement = request.nextUrl.searchParams.get('increment') === '1'

  if (!slug) {
    return NextResponse.json({ count: 0 })
  }

  try {
    if (shouldIncrement) {
      // Single DB operation: atomically increments and returns new count
      const { data, error } = await supabase
        .rpc('increment_view_count', { article_slug: slug })

      if (error) return NextResponse.json({ count: await getHistoricalViewCount(slug, 0) })
      return NextResponse.json({ count: await getHistoricalViewCount(slug, data || 0) })
    }

    // Read-only: just fetch current count
    const { data: article, error } = await supabase
      .from('articles')
      .select('view_count')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !article) return NextResponse.json({ count: 0 })
    const databaseCount = (article.view_count as number) || 0
    return NextResponse.json({ count: await getHistoricalViewCount(slug, databaseCount) })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
