import { NextResponse } from "next/server"
import { syncMajorProjects } from "@/lib/major-projects/sync"

// GET /api/admin/major-projects/sync
// Fetches the Alberta API (all sectors), diffs against the snapshot, flags
// new/updated projects, and returns the full tracked list. Called by the
// admin Major Projects page on load.

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
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
