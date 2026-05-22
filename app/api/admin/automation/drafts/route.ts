/**
 * Returns all auto-generated draft articles (author = 'Culture Alberta', status = 'draft').
 * GET /api/admin/automation/drafts
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, excerpt, slug, location, category, tags, status, author, image_url, created_at')
    .eq('status', 'draft')
    .eq('author', 'Culture Alberta')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
