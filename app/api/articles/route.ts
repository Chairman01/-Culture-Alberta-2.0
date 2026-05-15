import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://itdmwpbsnviassgqfhxk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
)

function mapSupabaseArticle(a: any) {
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    categories: a.categories,
    location: a.location,
    date: a.date || a.created_at,
    createdAt: a.created_at,
    imageUrl: a.image_url,
    slug: a.slug,
    status: a.status,
    type: a.type,
    author: a.author,
    tags: a.tags,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('id')
    const searchQuery = searchParams.get('search')

    // ── Search: query Supabase live for comprehensive results ──
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim()

      const { data, error } = await supabase
        .from('articles')
        .select('id, title, excerpt, category, categories, location, date, image_url, slug, status, type, author, tags')
        .eq('status', 'published')
        .neq('type', 'event')
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,category.ilike.%${q}%,content.ilike.%${q}%`)
        .order('date', { ascending: false })
        .limit(60)

      if (!error && data && data.length > 0) {
        return NextResponse.json(data.map(mapSupabaseArticle))
      }

      // Supabase returned nothing or errored — fall back to JSON filter
      const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
      if (fs.existsSync(fallbackPath)) {
        const fallbackArticles = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'))
        const ql = q.toLowerCase()
        const filtered = fallbackArticles.filter((a: any) =>
          a.title?.toLowerCase().includes(ql) ||
          a.excerpt?.toLowerCase().includes(ql) ||
          a.category?.toLowerCase().includes(ql) ||
          (a.categories || []).some((c: string) => c.toLowerCase().includes(ql)) ||
          a.description?.toLowerCase().includes(ql)
        )
        return NextResponse.json(filtered)
      }
      return NextResponse.json([])
    }

    // ── No search: try Supabase first for fresh data, fall back to JSON ──
    // For single-article lookup by ID, also try Supabase
    const listFields = 'id, title, excerpt, category, categories, location, date, created_at, image_url, slug, status, type, author, tags'

    if (!articleId) {
      // Listing: query Supabase for the freshest articles ordered by date
      const { data: liveData, error: liveError } = await supabase
        .from('articles')
        .select(listFields)
        .eq('status', 'published')
        .neq('type', 'event')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!liveError && liveData && liveData.length > 0) {
        return NextResponse.json(liveData.map(mapSupabaseArticle))
      }
    }

    // Fall back to JSON for listing (if Supabase failed) or for single-article lookups
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    if (!fs.existsSync(fallbackPath)) {
      return NextResponse.json({ error: 'Articles not available' }, { status: 404 })
    }
    const fileContents = fs.readFileSync(fallbackPath, 'utf-8')
    const fallbackArticles = JSON.parse(fileContents)

    if (articleId) {
      const article = fallbackArticles.find((a: any) => a.id === articleId)
      if (article) return NextResponse.json(article)
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json(fallbackArticles)
  } catch (error) {
    console.error('❌ API: Failed to load articles:', error)
    return NextResponse.json({
      error: 'Failed to load articles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
