import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { getArticleBySlug, getArticleById } from '@/lib/supabase-articles'
import { createSlug } from '@/lib/utils/slug'

export const dynamic = 'force-dynamic'

function publicArticleSummary(article: any) {
  if (!article) return null

  return {
    id: article.id,
    title: article.title,
    slug: article.slug || createSlug(article.title || ''),
    status: article.status,
    type: article.type,
    category: article.category,
    createdAt: article.createdAt || article.created_at || article.date,
    updatedAt: article.updatedAt || article.updated_at,
    imagePresent: !!(article.imageUrl || article.image_url || article.image),
    contentLength: typeof article.content === 'string' ? article.content.length : 0,
    excerptLength: typeof article.excerpt === 'string' ? article.excerpt.length : 0,
  }
}

function buildTitleSearchPattern(slug: string): string {
  const words = slug
    .toLowerCase()
    .split('-')
    .map(word => word.replace(/[%_]/g, ''))
    .filter(word => word.length > 1)
    .slice(0, 8)

  return words.length > 0 ? `%${words.join('%')}%` : `%${slug.replace(/[%_]/g, '')}%`
}

async function withTiming<T>(label: string, fn: () => Promise<T>) {
  const startedAt = Date.now()
  try {
    const value = await fn()
    return {
      label,
      ok: true,
      durationMs: Date.now() - startedAt,
      value,
    }
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET(request: NextRequest) {
  const authCheck = requireAdmin(request)
  if (!authCheck.ok) return authCheck.response

  const slug = request.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug query parameter' }, { status: 400 })
  }

  const requestId = `article-debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const normalizedSlug = slug.toLowerCase().replace(/^\/?articles\//, '').replace(/\/$/, '')
  const titlePattern = buildTitleSearchPattern(normalizedSlug)

  console.log('[article-debug:start]', JSON.stringify({
    requestId,
    slug: normalizedSlug,
    host: request.headers.get('host'),
    vercelEnv: process.env.VERCEL_ENV || null,
  }))

  const fallbackResult = await withTiming('optimizedFallback', async () => {
    const fallbackArticles = await loadOptimizedFallback()
    const match = fallbackArticles.find(article => {
      if (article.id === normalizedSlug) return true
      if (article.slug && article.slug.toLowerCase() === normalizedSlug) return true
      return createSlug(article.title) === normalizedSlug
    })

    return {
      total: fallbackArticles.length,
      match: publicArticleSummary(match),
    }
  })

  const supabaseSlugResult = await withTiming('supabaseSlug', async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id,title,slug,status,type,category,created_at,updated_at,image_url,image,excerpt,content')
      .eq('slug', normalizedSlug)
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return publicArticleSummary(data)
  })

  const supabaseTitleResult = await withTiming('supabaseTitlePattern', async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id,title,slug,status,type,category,created_at,updated_at,image_url,image,excerpt,content')
      .ilike('title', titlePattern)
      .limit(25)

    if (error) throw new Error(error.message)

    const candidates = data || []
    const exact = candidates.find(article => createSlug(article.title) === normalizedSlug)

    return {
      pattern: titlePattern,
      candidateCount: candidates.length,
      exact: publicArticleSummary(exact),
      candidates: candidates.slice(0, 5).map(publicArticleSummary),
    }
  })

  const publicResolverResult = await withTiming('publicResolver', async () => {
    const article = await getArticleBySlug(normalizedSlug) || await getArticleById(normalizedSlug)
    return publicArticleSummary(article)
  })

  const response = {
    requestId,
    slug: normalizedSlug,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      supabaseClientInitialized: !!supabase,
    },
    results: {
      fallback: fallbackResult,
      supabaseSlug: supabaseSlugResult,
      supabaseTitle: supabaseTitleResult,
      publicResolver: publicResolverResult,
    },
  }

  console.log('[article-debug:finish]', JSON.stringify({
    requestId,
    slug: normalizedSlug,
    fallbackFound: !!(fallbackResult as any).value?.match,
    supabaseSlugFound: !!(supabaseSlugResult as any).value,
    publicResolverFound: !!(publicResolverResult as any).value,
  }))

  return NextResponse.json(response)
}
