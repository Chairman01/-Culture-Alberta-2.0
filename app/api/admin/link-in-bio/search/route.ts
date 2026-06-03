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
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() || ''
    if (!q) return NextResponse.json({ articles: [] })

    const sb = getSupabase()
    const { data, error } = await sb
      .from('articles')
      .select('id, title, slug, image_url, category, categories, created_at, pinned_link_in_bio, link_in_bio_order')
      .eq('status', 'published')
      .neq('type', 'event')
      .ilike('title', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ articles: data || [] })
  } catch (err) {
    console.error('[link-in-bio/search]', err)
    return NextResponse.json({ articles: [] })
  }
}
