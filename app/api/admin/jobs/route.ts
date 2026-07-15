/**
 * Admin jobs API — list + delete.
 * Every handler is guarded by requireAdmin (middleware does not cover /api/*).
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, slug, company, city, category, status, source, is_manual, is_featured, posted_at, valid_through, created_at')
    .order('is_manual', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ jobs: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getServiceClient()
  const { error } = await supabase.from('jobs').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    revalidatePath('/jobs')
    revalidatePath('/jobs/calgary')
    revalidatePath('/jobs/edmonton')
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true })
}
