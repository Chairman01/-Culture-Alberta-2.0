// Assembles what the tracker pages render: the curated base list, editor
// overrides saved in admin, the Government of Alberta inventory's view of each
// project, the change log, and articles tagged `datacentre:{id}`.
//
// Each layer is optional. If Supabase or the province is unreachable the page
// still renders from the base list, so a bad morning for either never blanks
// the tool.

import { supabase } from '@/lib/supabase'
import {
  DATA_CENTRES, LAST_REVIEWED, sourceTier,
  type DataCentre, type DcSourceTier,
} from '@/lib/data/alberta-data-centres'

export const ARTICLE_TAG_PREFIX = 'datacentre:'
export const TRACKER_PATH = '/tools/alberta-data-centres'

export interface InventoryView {
  majorProjectId: number
  name: string
  stage: string
  costM: number | null
  schedule: string | null
  scheduleEnd: string | null
  developer: string | null
  url: string
}

export interface DcUpdate {
  id: number
  dcId: string
  happenedOn: string
  kind: 'editor' | 'inventory'
  headline: string
  detail: string | null
  sourceUrl: string | null
  articleSlug: string | null
}

export interface LinkedArticle {
  slug: string
  title: string
  imageUrl: string | null
  excerpt: string | null
  createdAt: string
}

export interface TrackedDataCentre extends DataCentre {
  tier: DcSourceTier
  verifiedOn: string
  editorNote: string | null
  inventory: InventoryView | null
  articles: LinkedArticle[]
  updates: DcUpdate[]
}

export interface TrackerData {
  items: TrackedDataCentre[]
  recentUpdates: DcUpdate[]
  inventoryFetchedAt: string | null
  lastReviewed: string
}

// ---------------------------------------------------------------------------
// Government of Alberta Major Projects Inventory
// ---------------------------------------------------------------------------
const INVENTORY_URL = 'https://majorprojects.alberta.ca/api/MajorProjects?years=1'

export function inventoryStage(raw: string | undefined): string {
  if (!raw) return 'Proposed'
  if (raw.startsWith('Under Construction')) return 'Under Construction'
  if (raw.startsWith('Proposed')) return 'Proposed'
  if (raw.startsWith('Completed')) return 'Completed'
  if (raw.startsWith('Cancelled')) return 'Cancelled'
  return raw
}

/** Every inventory row that looks like a data centre, keyed by inventory ID. */
export async function fetchInventory(): Promise<{ rows: Map<number, InventoryView>; fetchedAt: string } | null> {
  try {
    const res = await fetch(INVENTORY_URL, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const features: any[] = Array.isArray(json?.features) ? json.features : Array.isArray(json) ? json : []
    const rows = new Map<number, InventoryView>()
    for (const f of features) {
      const p = f?.properties
      if (!p || typeof p.id !== 'number') continue
      const hay = `${p.name ?? ''} ${p.type ?? ''} ${p.developer ?? ''}`
      if (!/data ?cent|datacent|compute|crypto/i.test(hay)) continue
      const slug = String(p.friendlyName || p.name || '').replace(/\s+/g, '-')
      rows.set(p.id, {
        majorProjectId: p.id,
        name: p.name ?? '',
        stage: inventoryStage(p.StageWithSubStage ?? p.stage),
        costM: typeof p.cost === 'number' ? p.cost : p.cost ? Number(p.cost) : null,
        schedule: p.schedule ? String(p.schedule).trim() || null : null,
        scheduleEnd: p.scheduleEnd ? String(p.scheduleEnd).trim() || null : null,
        developer: p.developer ?? null,
        url: `https://majorprojects.alberta.ca/details/${encodeURIComponent(slug)}/${p.id}`,
      })
    }
    return { rows, fetchedAt: new Date().toISOString() }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Supabase layers
// ---------------------------------------------------------------------------
type OverrideRow = { id: string; patch: Partial<DataCentre>; note: string | null; verified_on: string | null }

async function fetchOverrides(): Promise<Map<string, OverrideRow>> {
  const map = new Map<string, OverrideRow>()
  try {
    const { data } = await supabase.from('data_centre_overrides').select('id, patch, note, verified_on')
    for (const row of data ?? []) map.set(row.id, row as OverrideRow)
  } catch { /* base list still renders */ }
  return map
}

function mapUpdate(r: any): DcUpdate {
  return {
    id: r.id,
    dcId: r.dc_id,
    happenedOn: r.happened_on,
    kind: r.kind === 'inventory' ? 'inventory' : 'editor',
    headline: r.headline,
    detail: r.detail ?? null,
    sourceUrl: r.source_url ?? null,
    articleSlug: r.article_slug ?? null,
  }
}

export async function fetchUpdates(limit = 200): Promise<DcUpdate[]> {
  try {
    const { data } = await supabase
      .from('data_centre_updates')
      .select('id, dc_id, happened_on, kind, headline, detail, source_url, article_slug')
      .order('happened_on', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)
    return (data ?? []).map(mapUpdate)
  } catch {
    return []
  }
}

async function fetchLinkedArticles(ids: string[]): Promise<Map<string, LinkedArticle[]>> {
  const map = new Map<string, LinkedArticle[]>()
  if (ids.length === 0) return map
  try {
    const { data } = await supabase
      .from('articles')
      .select('slug, title, image_url, excerpt, created_at, tags')
      .eq('status', 'published')
      .overlaps('tags', ids.map(id => `${ARTICLE_TAG_PREFIX}${id}`))
      .order('created_at', { ascending: false })
      .limit(300)
    for (const a of data ?? []) {
      for (const tag of a.tags ?? []) {
        if (!String(tag).startsWith(ARTICLE_TAG_PREFIX)) continue
        const id = String(tag).slice(ARTICLE_TAG_PREFIX.length)
        if (!map.has(id)) map.set(id, [])
        map.get(id)!.push({
          slug: a.slug,
          title: a.title,
          imageUrl: a.image_url ?? null,
          excerpt: a.excerpt ?? null,
          createdAt: a.created_at,
        })
      }
    }
  } catch { /* cards render without coverage */ }
  return map
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
export async function getTrackerData(): Promise<TrackerData> {
  const ids = DATA_CENTRES.map(dc => dc.id)
  const [overrides, inventory, updates, articles] = await Promise.all([
    fetchOverrides(),
    fetchInventory(),
    fetchUpdates(),
    fetchLinkedArticles(ids),
  ])

  const byDc = new Map<string, DcUpdate[]>()
  for (const u of updates) {
    if (!byDc.has(u.dcId)) byDc.set(u.dcId, [])
    byDc.get(u.dcId)!.push(u)
  }

  const items: TrackedDataCentre[] = DATA_CENTRES.map(base => {
    const ov = overrides.get(base.id)
    const dc: DataCentre = ov ? { ...base, ...ov.patch } : base
    const inv = dc.majorProjectId ? inventory?.rows.get(dc.majorProjectId) ?? null : null
    return {
      ...dc,
      tier: sourceTier(dc),
      verifiedOn: ov?.verified_on ?? LAST_REVIEWED,
      editorNote: ov?.note ?? null,
      inventory: inv,
      articles: articles.get(dc.id) ?? [],
      updates: byDc.get(dc.id) ?? [],
    }
  })

  return {
    items,
    recentUpdates: updates.slice(0, 12),
    inventoryFetchedAt: inventory?.fetchedAt ?? null,
    lastReviewed: LAST_REVIEWED,
  }
}

export async function getTrackedDataCentre(id: string): Promise<{ item: TrackedDataCentre; all: TrackedDataCentre[] } | null> {
  const data = await getTrackerData()
  const item = data.items.find(dc => dc.id === id)
  return item ? { item, all: data.items } : null
}
