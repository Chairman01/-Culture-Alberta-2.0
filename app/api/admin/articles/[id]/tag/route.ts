import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin } from "@/lib/admin-auth"
import { getServiceClient } from "@/lib/supabase-admin"

// POST /api/admin/articles/[id]/tag  — add a project tag to an article by slug
// Body: { tag: string }   e.g. { tag: "project:10715" }

export const dynamic = "force-dynamic"

// Service role, not the public anon key: the anon key ships in the browser
// bundle, so anything it can write, the internet can write.
const getSupabase = getServiceClient

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id: slug } = await params
    const { tag } = await request.json()

    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "tag is required" }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch current tags by slug
    const { data: article, error: fetchErr } = await supabase
      .from("articles")
      .select("id, tags")
      .eq("slug", slug)
      .single()

    if (fetchErr || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const currentTags: string[] = article.tags ?? []
    if (currentTags.includes(tag)) {
      // Already tagged — return success without mutation
      return NextResponse.json({ ok: true, already: true })
    }

    const { error: updateErr } = await supabase
      .from("articles")
      .update({ tags: [...currentTags, tag] })
      .eq("id", article.id)

    if (updateErr) {
      console.error("[tag] Supabase update error:", updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[tag] Unhandled error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
