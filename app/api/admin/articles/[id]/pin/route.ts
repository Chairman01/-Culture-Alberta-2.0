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
    const { pinned } = await req.json()

    if (typeof pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned must be a boolean' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // If pinning, enforce max 4 pinned articles
    if (pinned) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('pinned_link_in_bio', true)
        .neq('id', id)

      if ((existing?.length ?? 0) >= 4) {
        return NextResponse.json(
          { error: 'Maximum 4 articles can be pinned. Unpin one first.' },
          { status: 400 },
        )
      }
    }

    const { error } = await supabase
      .from('articles')
      .update({ pinned_link_in_bio: pinned })
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
