import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const shouldIncrement = request.nextUrl.searchParams.get('increment') === '1'

  if (!slug) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const { data: article, error: selectError } = await supabase
      .from('articles')
      .select('view_count')
      .eq('slug', slug)
      .single()

    if (selectError || !article) {
      return NextResponse.json({ count: 0 })
    }

    const currentCount = (article.view_count as number) || 0
    const nextCount = shouldIncrement ? currentCount + 1 : currentCount

    if (shouldIncrement) {
      void Promise.resolve(
        supabase.from('articles').update({ view_count: nextCount }).eq('slug', slug)
      ).catch(() => {})
    }

    return NextResponse.json({ count: nextCount })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
