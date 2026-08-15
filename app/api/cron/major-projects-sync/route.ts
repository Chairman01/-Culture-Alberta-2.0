/**
 * Major Projects Sync Cron
 *
 * Called automatically by Vercel Cron daily. Fetches the Alberta Major Projects
 * Inventory, diffs it against the snapshot, and flags new/changed projects so
 * the admin dashboard "ping" stays accurate without anyone visiting the page.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 */

import { NextRequest, NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron-auth"
import { syncMajorProjects } from "@/lib/major-projects/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Previously this route also accepted an `x-vercel-cron: 1` header. Vercel
  // does not strip that header from inbound requests, so it left the sync
  // publicly triggerable by anyone — bearer token only now.
  if (!isCronAuthorized(req, "major-projects-sync cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await syncMajorProjects()
    return NextResponse.json({
      ok: true,
      baselined: result.baselined,
      counts: result.counts,
      syncedAt: result.syncedAt,
    })
  } catch (err) {
    console.error("[major-projects-sync cron] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}
