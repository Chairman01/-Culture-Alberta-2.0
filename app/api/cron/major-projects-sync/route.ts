/**
 * Major Projects Sync Cron
 *
 * Called automatically by Vercel Cron daily. Fetches the Alberta Major Projects
 * Inventory, diffs it against the snapshot, and flags new/changed projects so
 * the admin dashboard "ping" stays accurate without anyone visiting the page.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server"
import { syncMajorProjects } from "@/lib/major-projects/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  // Vercel Cron sends this header automatically; allow it through too.
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  if (isVercelCron) return true
  if (!secret) {
    console.error("[major-projects-sync cron] AUTOMATION_CRON_SECRET is not set")
    return false
  }
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
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
