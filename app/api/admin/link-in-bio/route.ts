import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo',
  )
}

// GET — return all pinned articles ordered by link_in_bio_order
export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('articles')
      .select('id, title, slug, image_url, category, categories, created_at, pinned_link_in_bio, link_in_bio_order')
      .eq('pinned_link_in_bio', true)
      .eq('status', 'published')
      .order('link_in_bio_order', { ascending: true, nullsFirst: false })

    if (error) throw error
    return NextResponse.json({ pinned: data || [] })
  } catch (err) {
    console.error('[link-in-bio GET]', err)
    return NextResponse.json({ pinned: [] })
  }
}

// POST — save the order: body = { order: [{ id, order }] }
export async function POST(req: NextRequest) {
  try {
    const { order } = await req.json() as { order: { id: string; order: number }[] }
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array' }, { status: 400 })
    }

    const sb = getSupabase()
    // Update each article's order in parallel
    await Promise.all(
      order.map(({ id, order: pos }) =>
        sb.from('articles').update({ link_in_bio_order: pos }).eq('id', id),
      ),
    )

    revalidatePath('/link-in-bio')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[link-in-bio POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
