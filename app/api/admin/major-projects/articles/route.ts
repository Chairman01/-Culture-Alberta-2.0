import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tags, fetchAll } = body

    // fetchAll: true → return all published articles (for the "Link Article" widget)
    if (fetchAll) {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, title, tags")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(2000)

      if (error) {
        console.error("[admin/major-projects/articles] fetchAll error:", error)
        return NextResponse.json([], { status: 500 })
      }
      return NextResponse.json(data ?? [])
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from("articles")
      .select("slug, title, tags")
      .eq("status", "published")
      .overlaps("tags", tags)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      console.error("[admin/major-projects/articles] Supabase error:", error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[admin/major-projects/articles] Error:", err)
    return NextResponse.json([], { status: 500 })
  }
}
