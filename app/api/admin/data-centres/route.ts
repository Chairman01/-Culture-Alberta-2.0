import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { getServiceClient } from "@/lib/supabase-admin"
import { submitUrlsToIndexNow } from "@/lib/indexing"
import { getTrackerData, TRACKER_PATH } from "@/lib/data-centres"
import { DATA_CENTRES } from "@/lib/data/alberta-data-centres"

export const dynamic = "force-dynamic"

const SITE = "https://www.culturealberta.com"

// Fields an editor may override from admin. Everything else stays in code so
// a typo in admin cannot, say, move a marker into Saskatchewan.
const EDITABLE = new Set([
  "status", "demandMW", "demandNote", "power", "powerNote", "workload", "costM",
  "jobsConstruction", "jobsPermanent", "timeline", "water", "summary", "operator",
])

// GET — merged list plus the raw override, for the admin table.
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response
  const data = await getTrackerData()
  const { data: overrides } = await getServiceClient()
    .from("data_centre_overrides")
    .select("id, patch, note, verified_on, updated_at")
  const byId = new Map((overrides ?? []).map(o => [o.id, o]))
  return NextResponse.json({
    lastReviewed: data.lastReviewed,
    inventoryFetchedAt: data.inventoryFetchedAt,
    items: data.items.map(dc => ({ ...dc, override: byId.get(dc.id) ?? null })),
  })
}

// PUT — save an override. Body: { id, patch, note, verifiedOn }
export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  const id = body?.id
  if (!id || !DATA_CENTRES.some(dc => dc.id === id)) {
    return NextResponse.json({ error: "Unknown data centre id" }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body.patch ?? {})) {
    if (!EDITABLE.has(k)) continue
    // Empty string means "clear this override, fall back to the code value".
    if (v === "" || v === undefined) continue
    patch[k] = v
  }

  const supabase = getServiceClient()
  const { error } = await supabase.from("data_centre_overrides").upsert({
    id,
    patch,
    note: body.note ?? null,
    verified_on: body.verifiedOn || null,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const paths = [TRACKER_PATH, `${TRACKER_PATH}/${id}`]
  try {
    for (const p of paths) revalidatePath(p)
    await submitUrlsToIndexNow(paths.map(p => `${SITE}${p}`))
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
