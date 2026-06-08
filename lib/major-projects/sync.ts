/**
 * Major Projects sync + change detection.
 *
 * Fetches the Government of Alberta Major Projects Inventory (all sectors),
 * diffs it against a snapshot stored in the `major_projects_seen` table, and
 * flags brand-new projects and meaningful changes (stage, cost, name) so the
 * admin can be "pinged" when there's something new to cover.
 *
 * First run = baseline: every current project is recorded as already-reviewed
 * so the admin isn't flooded with ~1,200 false "new" notifications. Only
 * projects that appear (or change) AFTER the baseline become pending.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

export const ALBERTA_API_URL =
  "https://majorprojects.alberta.ca/api/MajorProjects?years=1"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MajorProject {
  id: string
  name: string
  friendlyName?: string
  sector: string
  stage: string
  cost?: number
  municipalities: string[]
  type?: string
  developer?: string
  website?: string
}

export interface TrackedProject extends MajorProject {
  /** True when first seen after the baseline and not yet reviewed. */
  isNew: boolean
  /** True when a tracked project changed (stage/cost/name) and not yet reviewed. */
  isUpdated: boolean
  /** True while reviewed_at is null (new or updated, awaiting review). */
  pending: boolean
  /** Human-readable description of the latest change, if any. */
  changeNote?: string
  firstSeenAt?: string
  lastChangedAt?: string
}

export interface SyncResult {
  projects: TrackedProject[]
  counts: {
    total: number
    pending: number
    newCount: number
    updatedCount: number
  }
  baselined: boolean
  syncedAt: string
}

interface SeenRow {
  project_id: string
  name: string | null
  friendly_name: string | null
  sector: string | null
  stage: string | null
  cost: number | null
  municipalities: string[] | null
  type: string | null
  developer: string | null
  website: string | null
  signature: string
  first_seen_at: string
  last_changed_at: string
  reviewed_at: string | null
  change_note: string | null
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://itdmwpbsnviassgqfhxk.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// ---------------------------------------------------------------------------
// Alberta API parsing
// ---------------------------------------------------------------------------
function normalizeStage(raw: string): string {
  if (!raw) return "Proposed"
  if (raw.startsWith("Under Construction")) return "Under Construction"
  if (raw.startsWith("Proposed")) return "Proposed"
  if (raw.startsWith("Completed")) return "Completed"
  if (raw.startsWith("Cancelled")) return "Cancelled"
  return raw
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProject(feature: any): MajorProject | null {
  const p = feature?.properties ?? feature
  if (!p) return null

  const stage = normalizeStage(p.StageWithSubStage ?? p.stage ?? "Proposed")
  if (stage === "Cancelled") return null

  const id = String(p.id ?? feature.id ?? "")
  if (!id) return null

  return {
    id,
    name: p.name ?? "Unnamed Project",
    friendlyName:
      p.friendlyName && p.friendlyName !== p.name
        ? String(p.friendlyName).replace(/-/g, " ")
        : undefined,
    sector: p.sector ?? "Other",
    stage,
    cost:
      typeof p.cost === "number" ? p.cost : p.cost ? parseFloat(p.cost) : undefined,
    municipalities: Array.isArray(p.municipalities)
      ? p.municipalities
      : p.municipality
        ? [p.municipality]
        : [],
    type: p.type ?? undefined,
    developer: p.developer ?? undefined,
    website: p.website && String(p.website).startsWith("http") ? p.website : undefined,
  }
}

async function fetchAlbertaProjects(): Promise<MajorProject[]> {
  const res = await fetch(ALBERTA_API_URL, { cache: "no-store" })
  if (!res.ok) throw new Error(`Alberta API returned ${res.status}`)
  const json = await res.json()
  const features: unknown[] = Array.isArray(json?.features)
    ? json.features
    : Array.isArray(json)
      ? json
      : []
  return features
    .map(parseProject)
    .filter((p): p is MajorProject => p !== null)
}

// ---------------------------------------------------------------------------
// Change detection helpers
// ---------------------------------------------------------------------------
/** A compact fingerprint of the fields we care about for change detection. */
function signatureOf(p: MajorProject): string {
  const cost = p.cost != null ? Math.round(p.cost) : ""
  return `${p.stage}||${cost}||${p.name}||${p.sector}`
}

function fmtCost(cost?: number | null): string {
  if (cost == null) return "—"
  return cost >= 1000 ? `$${(cost / 1000).toFixed(1)}B` : `$${Math.round(cost)}M`
}

/** Describe what changed between the stored snapshot and the live project. */
function describeChange(prev: SeenRow, next: MajorProject): string {
  const parts: string[] = []
  if ((prev.stage ?? "") !== next.stage) {
    parts.push(`Stage: ${prev.stage ?? "—"} → ${next.stage}`)
  }
  const prevCost = prev.cost != null ? Math.round(prev.cost) : null
  const nextCost = next.cost != null ? Math.round(next.cost) : null
  if (prevCost !== nextCost) {
    parts.push(`Budget: ${fmtCost(prev.cost)} → ${fmtCost(next.cost)}`)
  }
  if ((prev.name ?? "") !== next.name) {
    parts.push(`Renamed`)
  }
  return parts.length ? parts.join(" · ") : "Updated"
}

function rowFromProject(
  p: MajorProject,
  extra: Partial<SeenRow> = {}
): Omit<SeenRow, "first_seen_at" | "last_changed_at"> & {
  first_seen_at?: string
  last_changed_at?: string
} {
  return {
    project_id: p.id,
    name: p.name,
    friendly_name: p.friendlyName ?? null,
    sector: p.sector,
    stage: p.stage,
    cost: p.cost ?? null,
    municipalities: p.municipalities,
    type: p.type ?? null,
    developer: p.developer ?? null,
    website: p.website ?? null,
    signature: signatureOf(p),
    reviewed_at: null,
    change_note: null,
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// Main sync
// ---------------------------------------------------------------------------
export async function syncMajorProjects(): Promise<SyncResult> {
  const supabase = getSupabase()
  const syncedAt = new Date().toISOString()

  const live = await fetchAlbertaProjects()

  // Read the full snapshot. Supabase caps a single select at 1000 rows, so we
  // page through with .range() — otherwise rows past 1000 look "missing" and
  // get re-inserted, colliding on the primary key.
  const seen = new Map<string, SeenRow>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("major_projects_seen")
      .select("*")
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Supabase read failed: ${error.message}`)
    const rows = (data ?? []) as SeenRow[]
    for (const row of rows) seen.set(row.project_id, row)
    if (rows.length < PAGE) break
  }

  // ----- First run: baseline everything as already-reviewed -----
  if (seen.size === 0) {
    const nowIso = syncedAt
    const baselineRows = live.map((p) =>
      rowFromProject(p, {
        reviewed_at: nowIso,
        change_note: "baseline",
        first_seen_at: nowIso,
        last_changed_at: nowIso,
      })
    )
    if (baselineRows.length) {
      // Insert in chunks to stay well under payload limits.
      for (let i = 0; i < baselineRows.length; i += 500) {
        const chunk = baselineRows.slice(i, i + 500)
        const { error } = await supabase.from("major_projects_seen").insert(chunk)
        if (error) throw new Error(`Baseline insert failed: ${error.message}`)
      }
    }
    return {
      projects: live.map((p) => ({
        ...p,
        isNew: false,
        isUpdated: false,
        pending: false,
        firstSeenAt: nowIso,
        lastChangedAt: nowIso,
      })),
      counts: { total: live.length, pending: 0, newCount: 0, updatedCount: 0 },
      baselined: true,
      syncedAt,
    }
  }

  // ----- Normal diff -----
  const newInserts: ReturnType<typeof rowFromProject>[] = []
  const updates: { id: string; patch: Partial<SeenRow> }[] = []
  const tracked: TrackedProject[] = []

  for (const p of live) {
    const prev = seen.get(p.id)
    const sig = signatureOf(p)

    if (!prev) {
      // Brand-new project → pending.
      newInserts.push(
        rowFromProject(p, {
          reviewed_at: null,
          change_note: "New project",
          first_seen_at: syncedAt,
          last_changed_at: syncedAt,
        })
      )
      tracked.push({
        ...p,
        isNew: true,
        isUpdated: false,
        pending: true,
        changeNote: "New project",
        firstSeenAt: syncedAt,
        lastChangedAt: syncedAt,
      })
      continue
    }

    if (prev.signature !== sig) {
      // Meaningful change → pending again with a note.
      const note = describeChange(prev, p)
      updates.push({
        id: p.id,
        patch: {
          name: p.name,
          friendly_name: p.friendlyName ?? null,
          sector: p.sector,
          stage: p.stage,
          cost: p.cost ?? null,
          municipalities: p.municipalities,
          type: p.type ?? null,
          developer: p.developer ?? null,
          website: p.website ?? null,
          signature: sig,
          reviewed_at: null,
          change_note: note,
          last_changed_at: syncedAt,
        },
      })
      tracked.push({
        ...p,
        isNew: false,
        isUpdated: true,
        pending: true,
        changeNote: note,
        firstSeenAt: prev.first_seen_at,
        lastChangedAt: syncedAt,
      })
      continue
    }

    // Unchanged — carry over its review state.
    const pending = prev.reviewed_at == null
    tracked.push({
      ...p,
      isNew: pending && prev.change_note === "New project",
      isUpdated: pending && prev.change_note !== "New project",
      pending,
      changeNote: prev.change_note ?? undefined,
      firstSeenAt: prev.first_seen_at,
      lastChangedAt: prev.last_changed_at,
    })
  }

  if (newInserts.length) {
    for (let i = 0; i < newInserts.length; i += 500) {
      const chunk = newInserts.slice(i, i + 500)
      const { error } = await supabase.from("major_projects_seen").insert(chunk)
      if (error) throw new Error(`New-project insert failed: ${error.message}`)
    }
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("major_projects_seen")
      .update(u.patch)
      .eq("project_id", u.id)
    if (error) throw new Error(`Update failed for ${u.id}: ${error.message}`)
  }

  const newCount = tracked.filter((t) => t.isNew).length
  const updatedCount = tracked.filter((t) => t.isUpdated).length

  return {
    projects: tracked,
    counts: {
      total: tracked.length,
      pending: newCount + updatedCount,
      newCount,
      updatedCount,
    },
    baselined: false,
    syncedAt,
  }
}

// ---------------------------------------------------------------------------
// Pending count (cheap — table only, no Alberta API call)
// ---------------------------------------------------------------------------
export async function getPendingCount(): Promise<number> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from("major_projects_seen")
    .select("project_id", { count: "exact", head: true })
    .is("reviewed_at", null)
  if (error) throw new Error(`Pending count failed: ${error.message}`)
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Mark reviewed (clears the ping)
// ---------------------------------------------------------------------------
export async function markReviewed(projectIds?: string[]): Promise<number> {
  const supabase = getSupabase()
  const reviewedAt = new Date().toISOString()

  let query = supabase
    .from("major_projects_seen")
    .update({ reviewed_at: reviewedAt })
    .is("reviewed_at", null)

  if (projectIds && projectIds.length > 0) {
    query = supabase
      .from("major_projects_seen")
      .update({ reviewed_at: reviewedAt })
      .in("project_id", projectIds)
  }

  const { data, error } = await query.select("project_id")
  if (error) throw new Error(`Mark reviewed failed: ${error.message}`)
  return data?.length ?? 0
}
