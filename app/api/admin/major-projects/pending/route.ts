import { NextResponse } from "next/server"
import { getPendingCount } from "@/lib/major-projects/sync"

// GET /api/admin/major-projects/pending
// Cheap count of unreviewed (new or updated) projects. Powers the dashboard
// "ping" badge — reads the snapshot table only, no Alberta API call.

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const count = await getPendingCount()
    return NextResponse.json({ count })
  } catch (err) {
    console.error("[major-projects/pending] error:", err)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
