import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/articles/views?slug=some-article-slug
// Returns the total view count for an article
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const timeoutMs = process.env.NODE_ENV === 'development' ? 1200 : 2500
    const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T | null> => {
      try {
        return await Promise.race([
          promise,
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
          )
        ])
      } catch {
        return null
      }
    }

    const pageViewsPromise = supabase
      .from('analytics_page_views')
      .select('*', { count: 'exact', head: true })
      .or(`page_path.ilike.%${slug}%`)

    const contentViewsPromise = supabase
      .from('analytics_content_views')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'article')
      .or(`content_id.ilike.%${slug}%`)

    const [pageViewsResult, contentViewsResult] = await Promise.all([
      withTimeout(pageViewsPromise as any, 'analytics_page_views'),
      withTimeout(contentViewsPromise as any, 'analytics_content_views')
    ])

    const pageViewCount = (pageViewsResult as any)?.count || 0
    const contentViewCount = (contentViewsResult as any)?.count || 0

    const total = (pageViewCount || 0) + (contentViewCount || 0)
    return NextResponse.json({ count: total })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
