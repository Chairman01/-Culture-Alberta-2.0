import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Service role, not the public anon key: the anon key ships in the browser
// bundle, so anything it can write, the internet can write.
const getSupabaseClient = getServiceClient

// PATCH /api/admin/articles/[id]/pin
// Body: { pinned: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

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
