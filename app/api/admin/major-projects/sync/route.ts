import { NextRequest, NextResponse } from "next/server"
import { syncMajorProjects } from "@/lib/major-projects/sync"
import { requireAdmin } from "@/lib/admin-auth"

// GET /api/admin/major-projects/sync
// Fetches the Alberta API (all sectors), diffs against the snapshot, flags
// new/updated projects, and returns the full tracked list. Called by the
// admin Major Projects page on load.

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Unauthenticated this was a 60s Alberta-API sync anyone could fire in a
  // loop — a billing lever as much as a data one. The cron path is separate
  // (app/api/cron/major-projects-sync) and carries its own bearer token.
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const result = await syncMajorProjects()
    return NextResponse.json(result)
  } catch (err) {
    console.error("[major-projects/sync] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}
