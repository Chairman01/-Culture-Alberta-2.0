import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { getServiceClient } from "@/lib/supabase-admin"
import { submitUrlsToIndexNow } from "@/lib/indexing"
import { TRACKER_PATH } from "@/lib/data-centres"
import { DATA_CENTRES } from "@/lib/data/alberta-data-centres"

export const dynamic = "force-dynamic"

const SITE = "https://www.culturealberta.com"

// POST — log a change. Body: { dcId, headline, detail?, sourceUrl?, articleSlug?, happenedOn? }
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  const dcId = body?.dcId
  const headline = String(body?.headline ?? "").trim()
  if (!dcId || !DATA_CENTRES.some(dc => dc.id === dcId)) {
    return NextResponse.json({ error: "Unknown data centre id" }, { status: 400 })
  }
  if (!headline) return NextResponse.json({ error: "headline is required" }, { status: 400 })

  const { error } = await getServiceClient().from("data_centre_updates").insert({
    dc_id: dcId,
    kind: "editor",
    headline,
    detail: body.detail ? String(body.detail) : null,
    source_url: body.sourceUrl ? String(body.sourceUrl) : null,
    article_slug: body.articleSlug ? String(body.articleSlug) : null,
    happened_on: body.happenedOn || undefined,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const paths = [TRACKER_PATH, `${TRACKER_PATH}/${dcId}`]
  try {
    for (const p of paths) revalidatePath(p)
    await submitUrlsToIndexNow(paths.map(p => `${SITE}${p}`))
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

// DELETE — remove a log entry. Body: { id }
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => null)
  const id = Number(body?.id)
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const { error } = await getServiceClient().from("data_centre_updates").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath(TRACKER_PATH)
  return NextResponse.json({ ok: true })
}
