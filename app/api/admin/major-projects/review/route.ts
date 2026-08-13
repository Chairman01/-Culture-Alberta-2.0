import { NextRequest, NextResponse } from "next/server"
import { markReviewed } from "@/lib/major-projects/sync"
import { requireAdmin } from "@/lib/admin-auth"

// POST /api/admin/major-projects/review
// Body: { projectIds?: string[] }
//   - omit projectIds (or send []) → mark ALL pending projects reviewed
//   - send specific ids           → mark just those reviewed
// Clears the dashboard ping.

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  try {
    let projectIds: string[] | undefined
    try {
      const body = await req.json()
      if (Array.isArray(body?.projectIds)) projectIds = body.projectIds
    } catch {
      // empty body → mark all
    }
    const reviewed = await markReviewed(projectIds)
    return NextResponse.json({ ok: true, reviewed })
  } catch (err) {
    console.error("[major-projects/review] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Review failed" },
      { status: 500 }
    )
  }
}
