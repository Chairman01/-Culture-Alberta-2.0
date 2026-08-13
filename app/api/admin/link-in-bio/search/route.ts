import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Service role, not the public anon key: the anon key ships in the browser
// bundle, so anything it can write, the internet can write.
const getSupabase = getServiceClient

// GET /api/admin/link-in-bio/search?q=...
// When q is empty, returns 60 most recent articles so admin can browse all
// When q is set, searches all articles with no cap so old articles are findable
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() || ''

    const sb = getSupabase()
    let query = sb
      .from('articles')
      .select('id, title, slug, image_url, category, categories, created_at, pinned_link_in_bio, link_in_bio_order')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (q) {
      query = query.ilike('title', `%${q}%`)
    } else {
      query = query.limit(60)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ articles: data || [] })
  } catch (err) {
    console.error('[link-in-bio/search]', err)
    return NextResponse.json({ articles: [] })
  }
}
