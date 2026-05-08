import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/articles/views?slug=some-article-slug
// Returns view count and increments it (single indexed lookup on articles.view_count)
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ count: 0 })
  }

  try {
    // Read current count
    const { data: article, error: selectError } = await supabase
      .from('articles')
      .select('view_count')
      .eq('slug', slug)
      .single()

    if (selectError || !article) {
      return NextResponse.json({ count: 0 })
    }

    const currentCount = (article.view_count as number) || 0

    // Increment in background — small race window is acceptable for a view counter
    void Promise.resolve(
      supabase.from('articles').update({ view_count: currentCount + 1 }).eq('slug', slug)
    ).catch(() => {})

    return NextResponse.json({ count: currentCount + 1 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
