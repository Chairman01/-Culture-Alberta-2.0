import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  return createClient(supabaseUrl, supabaseKey)
}

// PATCH /api/admin/articles/[id]/pin
// Body: { pinned: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { pinned, order } = body

    if (typeof pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned must be a boolean' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const updatePayload: Record<string, unknown> = { pinned_link_in_bio: pinned }
    if (pinned && typeof order === 'number') {
      updatePayload.link_in_bio_order = order
    }
    if (!pinned) {
      updatePayload.link_in_bio_order = null
    }

    const { error } = await supabase
      .from('articles')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      console.error('[pin] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/link-in-bio')

    return NextResponse.json({ success: true, pinned })
  } catch (err) {
    console.error('[pin] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
