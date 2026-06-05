import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo',
  )
}

// GET /api/admin/link-in-bio/search?q=...
// When q is empty, returns 60 most recent articles so admin can browse all
// When q is set, searches all articles with no cap so old articles are findable
export async function GET(req: NextRequest) {
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
