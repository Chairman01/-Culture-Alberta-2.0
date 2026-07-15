/**
 * Admin jobs API — read + update a single posting.
 * Slug is intentionally NOT updatable — slug churn resets the page's SEO.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { sanitizeAdminHtml } from '@/lib/sanitize-html'
import { isJobCity } from '@/lib/jobs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ job: data })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.title !== undefined) update.title = String(body.title).trim()
  if (body.company !== undefined) update.company = String(body.company).trim()
  if (body.city !== undefined) {
    const city = String(body.city).toLowerCase()
    if (!isJobCity(city)) return NextResponse.json({ error: 'city must be calgary or edmonton' }, { status: 400 })
    update.city = city
  }
  if (body.location_raw !== undefined) update.location_raw = body.location_raw ? String(body.location_raw) : null
  if (body.category !== undefined) update.category = body.category ? String(body.category) : null
  if (body.description_snippet !== undefined) update.description_snippet = body.description_snippet ? String(body.description_snippet) : null
  if (body.description_html !== undefined) update.description_html = body.description_html ? sanitizeAdminHtml(String(body.description_html)) : null
  if (body.salary_min !== undefined) update.salary_min = typeof body.salary_min === 'number' ? body.salary_min : null
  if (body.salary_max !== undefined) update.salary_max = typeof body.salary_max === 'number' ? body.salary_max : null
  if (body.salary_label !== undefined) update.salary_label = body.salary_label ? String(body.salary_label) : null
  if (body.employment_type !== undefined) update.employment_type = body.employment_type ? String(body.employment_type) : null
  if (body.apply_url !== undefined) update.apply_url = String(body.apply_url).trim()
  if (body.source_url !== undefined) update.source_url = body.source_url ? String(body.source_url) : null
  if (body.posted_at !== undefined) update.posted_at = body.posted_at ? String(body.posted_at) : null
  if (body.valid_through !== undefined) update.valid_through = body.valid_through ? String(body.valid_through) : null
  if (body.status !== undefined && ['active', 'expired', 'draft'].includes(String(body.status))) {
    update.status = String(body.status)
  }
  if (body.is_featured !== undefined) update.is_featured = body.is_featured === true

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('jobs')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    revalidatePath('/jobs')
    revalidatePath(`/jobs/${data.city}`)
    revalidatePath(`/jobs/posting/${data.slug}`)
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, job: data })
}
