import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/articles/views?slug=some-article-slug
// Increments view count and returns the new total (single indexed UPDATE on articles table)
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const { data, error } = await supabase.rpc('increment_view_count', { article_slug: slug })

    if (error) {
      console.warn('increment_view_count error:', error.message)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: data ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
