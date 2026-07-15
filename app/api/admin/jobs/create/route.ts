/**
 * Admin jobs API — create a manual posting.
 * Manual postings carry a full description_html, which makes them eligible
 * for JobPosting structured data (Google for Jobs).
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { sanitizeAdminHtml } from '@/lib/sanitize-html'
import { buildJobSlug, isJobCity } from '@/lib/jobs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = String(body.title || '').trim()
  const company = String(body.company || '').trim()
  const city = String(body.city || '').toLowerCase()
  const applyUrl = String(body.apply_url || '').trim()
  const validThrough = String(body.valid_through || '').trim()

  if (!title || !company || !applyUrl) {
    return NextResponse.json({ error: 'title, company and apply_url are required' }, { status: 400 })
  }
  if (!isJobCity(city)) {
    return NextResponse.json({ error: 'city must be calgary or edmonton' }, { status: 400 })
  }
  if (!validThrough) {
    return NextResponse.json({ error: 'valid_through is required for manual postings' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const row = {
    source: 'manual',
    source_id: null,
    title,
    slug: buildJobSlug(title, company),
    company,
    city,
    location_raw: body.location_raw ? String(body.location_raw) : null,
    category: body.category ? String(body.category) : null,
    description_snippet: body.description_snippet ? String(body.description_snippet) : null,
    description_html: body.description_html ? sanitizeAdminHtml(String(body.description_html)) : null,
    salary_min: typeof body.salary_min === 'number' ? body.salary_min : null,
    salary_max: typeof body.salary_max === 'number' ? body.salary_max : null,
    salary_label: body.salary_label ? String(body.salary_label) : null,
    employment_type: body.employment_type ? String(body.employment_type) : null,
    apply_url: applyUrl,
    source_url: body.source_url ? String(body.source_url) : null,
    posted_at: body.posted_at ? String(body.posted_at) : new Date().toISOString(),
    valid_through: validThrough,
    status: body.status === 'draft' ? 'draft' : 'active',
    is_manual: true,
    is_featured: body.is_featured === true,
  }

  const { data, error } = await supabase.from('jobs').insert([row]).select().single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    revalidatePath('/jobs')
    revalidatePath(`/jobs/${city}`)
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, job: data })
}
