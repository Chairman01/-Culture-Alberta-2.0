import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

      if (error) return NextResponse.json({ count: 0 })
      return NextResponse.json({ count: data || 0 })
    }

    // Read-only: just fetch current count
    const { data: article, error } = await supabase
      .from('articles')
      .select('view_count')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !article) return NextResponse.json({ count: 0 })
    return NextResponse.json({ count: (article.view_count as number) || 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
