/**
 * Data Centre Tracker sync — daily.
 *
 * Diffs the Government of Alberta Major Projects Inventory against our snapshot
 * and writes any stage / cost / schedule change for a tracked data centre into
 * the public change log, then re-renders and IndexNow-pings the affected pages.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET) — see lib/cron-auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron-auth"
import { syncDataCentreInventory } from "@/lib/data-centres/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, "data-centres-sync cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await syncDataCentreInventory()
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    console.error("[data-centres-sync cron] error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 })
  }
}
