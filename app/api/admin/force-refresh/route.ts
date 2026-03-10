import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch articles' }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ success: false, message: 'No articles found' }, { status: 404 })
    }

    const mappedArticles = articles.map(article => ({
      ...article,
      imageUrl: article.image_url,
      date: article.created_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }))

    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    fs.writeFileSync(fallbackPath, JSON.stringify(mappedArticles, null, 2))

    return NextResponse.json({
      success: true,
      message: `Updated fallback file with ${mappedArticles.length} articles`,
      articleCount: mappedArticles.length,
    })
  } catch (error) {
    console.error('[force-refresh] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ success: false, message: 'Force refresh failed' }, { status: 500 })
  }
}
