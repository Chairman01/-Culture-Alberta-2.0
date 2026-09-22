// Daily diff of the Government of Alberta Major Projects Inventory against our
// snapshot. When the province moves a tracked data centre to a new stage, or
// changes its cost or schedule, an 'inventory' entry lands in the change log
// and the affected pages are re-rendered and pinged to search engines.
//
// This is what keeps the tracker honest between editor reviews: the base list
// can say "proposed" for months, but the log will show the day the province
// said "under construction".

import { revalidatePath } from 'next/cache'
import { getServiceClient } from '@/lib/supabase-admin'
import { submitUrlsToIndexNow } from '@/lib/indexing'
import { DATA_CENTRES } from '@/lib/data/alberta-data-centres'
import { fetchInventory, TRACKER_PATH, type InventoryView } from './index'

const SITE = 'https://www.culturealberta.com'

function fmtCost(m: number | null): string {
  if (m == null) return 'not listed'
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m}M`
}

function describeChange(prev: any, next: InventoryView): { headline: string; detail: string } | null {
  const changes: string[] = []
  if (prev.stage !== next.stage) changes.push(`stage ${prev.stage ?? 'unlisted'} → ${next.stage}`)
  const prevCost = prev.cost == null ? null : Number(prev.cost)
  if (prevCost !== next.costM) changes.push(`cost ${fmtCost(prevCost)} → ${fmtCost(next.costM)}`)
  const prevSched = [prev.schedule, prev.schedule_end].filter(Boolean).join('–') || null
  const nextSched = [next.schedule, next.scheduleEnd].filter(Boolean).join('–') || null
  if (prevSched !== nextSched) changes.push(`schedule ${prevSched ?? 'not listed'} → ${nextSched ?? 'not listed'}`)
  if ((prev.developer ?? null) !== (next.developer ?? null)) changes.push(`developer now listed as ${next.developer ?? 'not listed'}`)
  if (changes.length === 0) return null
  const lead = prev.stage !== next.stage
    ? `Province now lists this project as ${next.stage.toLowerCase()}`
    : 'Province updated this project in its Major Projects Inventory'
  return { headline: lead, detail: changes.join('; ') }
}

export async function syncDataCentreInventory(): Promise<{
  ok: boolean
  matched: number
  changed: string[]
  newInInventory: string[]
  error?: string
}> {
  const inventory = await fetchInventory()
  if (!inventory) return { ok: false, matched: 0, changed: [], newInInventory: [], error: 'inventory unreachable' }

  const supabase = getServiceClient()
  const { data: snapRows } = await supabase.from('data_centre_inventory_snapshot').select('*')
  const snapshot = new Map<number, any>((snapRows ?? []).map(r => [r.major_project_id, r]))
  const firstRun = snapshot.size === 0

  const tracked = new Map<number, string>()
  for (const dc of DATA_CENTRES) if (dc.majorProjectId) tracked.set(dc.majorProjectId, dc.id)

  const changed: string[] = []
  const newInInventory: string[] = []
  const touchedPaths = new Set<string>()

  for (const [mpId, row] of inventory.rows) {
    const prev = snapshot.get(mpId)
    const dcId = tracked.get(mpId)

    if (!prev && !firstRun && !dcId) {
      // A data centre the province lists that we do not track yet. Log it against
      // a placeholder so it shows up in admin rather than being missed.
      newInInventory.push(row.name)
      await supabase.from('data_centre_updates').insert({
        dc_id: `inventory:${mpId}`,
        kind: 'inventory',
        headline: `New in the provincial inventory: ${row.name}`,
        detail: `${row.stage}; ${fmtCost(row.costM)}; ${row.developer ?? 'developer not listed'}`,
        source_url: row.url,
      })
    } else if (prev && dcId) {
      const change = describeChange(prev, row)
      if (change) {
        changed.push(dcId)
        await supabase.from('data_centre_updates').insert({
          dc_id: dcId,
          kind: 'inventory',
          headline: change.headline,
          detail: change.detail,
          source_url: row.url,
        })
        touchedPaths.add(`${TRACKER_PATH}/${dcId}`)
      }
    }

    await supabase.from('data_centre_inventory_snapshot').upsert({
      major_project_id: mpId,
      name: row.name,
      stage: row.stage,
      cost: row.costM,
      schedule: row.schedule,
      schedule_end: row.scheduleEnd,
      developer: row.developer,
      seen_at: new Date().toISOString(),
    })
  }

  if (changed.length > 0 || newInInventory.length > 0) {
    touchedPaths.add(TRACKER_PATH)
    try {
      for (const p of touchedPaths) revalidatePath(p)
      await submitUrlsToIndexNow([...touchedPaths].map(p => `${SITE}${p}`))
    } catch (err) {
      console.warn('[data-centres-sync] revalidate/IndexNow failed (non-fatal):', err)
    }
  }

  return { ok: true, matched: tracked.size, changed, newInInventory }
}
