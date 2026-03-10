import { NextRequest, NextResponse } from 'next/server'
import { autoSyncArticles } from '@/lib/auto-sync'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const result = await autoSyncArticles()

    if (result.success) {
      return NextResponse.json({ success: true, count: result.count, message: `Synced ${result.count} articles` })
    } else {
      return NextResponse.json({ success: false, error: result.error, message: 'Sync failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('[auto-sync] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ success: false, message: 'Auto-sync failed' }, { status: 500 })
  }
}
