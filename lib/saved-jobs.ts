'use client'

import { supabaseBrowser } from '@/lib/supabase-browser'
import { JOB_CITY_LABELS } from '@/lib/jobs'
import { SAVED_JOB_STATUS_RANK, type JobCity, type SavedJobStatus } from '@/lib/types/job'

/**
 * Browser helpers for the per-user job tracker (public.saved_jobs).
 * All access is scoped to the signed-in user by row-level security.
 * Mirrors lib/saved-articles.ts.
 */

export async function isJobSaved(jobId: string): Promise<boolean> {
    const { data } = await supabaseBrowser
        .from('saved_jobs')
        .select('job_id')
        .eq('job_id', jobId)
        .maybeSingle()
    return !!data
}

export async function saveJob(userId: string, jobId: string, status: SavedJobStatus = 'saved'): Promise<void> {
    const { error } = await supabaseBrowser
        .from('saved_jobs')
        .insert({ user_id: userId, job_id: jobId, status })
    // Ignore duplicate-key races (already saved).
    if (error && error.code !== '23505') throw error
}

export async function unsaveJob(jobId: string): Promise<void> {
    const { error } = await supabaseBrowser
        .from('saved_jobs')
        .delete()
        .eq('job_id', jobId)
    if (error) throw error
}

/** Tracker status for one job, or null when it isn't tracked. */
export async function getJobTrackStatus(jobId: string): Promise<SavedJobStatus | null> {
    const { data } = await supabaseBrowser
        .from('saved_jobs')
        .select('status')
        .eq('job_id', jobId)
        .maybeSingle()
    return (data?.status as SavedJobStatus) ?? null
}

/**
 * Every tracked job for the signed-in user, as jobId → status.
 *
 * One query for the whole board rather than one per card: RLS already scopes
 * the table to this user and nobody tracks more than a few dozen jobs, so the
 * full set is far cheaper than 400 lookups against a 594-row board.
 */
export async function listJobTrackStatuses(): Promise<Record<string, SavedJobStatus>> {
    const { data, error } = await supabaseBrowser
        .from('saved_jobs')
        .select('job_id, status')
    if (error) return {}
    const out: Record<string, SavedJobStatus> = {}
    for (const row of data ?? []) out[row.job_id as string] = row.status as SavedJobStatus
    return out
}

/**
 * Move a job forward in the pipeline, never backward.
 *
 * Clicking Apply on a job already marked 'interviewing' should leave it there —
 * the click says nothing new. Returns the status the row now holds.
 */
export async function advanceSavedJobStatus(
    userId: string,
    jobId: string,
    status: SavedJobStatus
): Promise<SavedJobStatus> {
    const current = await getJobTrackStatus(jobId)
    if (current === null) {
        await saveJob(userId, jobId, status)
        return status
    }
    if (SAVED_JOB_STATUS_RANK[current] >= SAVED_JOB_STATUS_RANK[status]) return current
    await updateSavedJobStatus(jobId, status)
    return status
}

export async function updateSavedJobStatus(
    jobId: string,
    status: SavedJobStatus,
    notes?: string
): Promise<void> {
    const update: { status: SavedJobStatus; notes?: string } = { status }
    if (notes !== undefined) update.notes = notes
    const { error } = await supabaseBrowser
        .from('saved_jobs')
        .update(update)
        .eq('job_id', jobId)
    if (error) throw error
}

export interface SavedJobCard {
    jobId: string
    slug: string
    title: string
    company: string
    city: string
    trackStatus: SavedJobStatus
    notes: string | null
    jobStatus: string       // 'active' | 'expired' — for the expired badge
    savedAt: string
}

/** The user's tracked jobs, newest first, joined to job display fields. */
export async function listSavedJobs(): Promise<SavedJobCard[]> {
    const { data: saved, error } = await supabaseBrowser
        .from('saved_jobs')
        .select('job_id, status, notes, created_at')
        .order('created_at', { ascending: false })
    if (error) throw error
    const rows = saved || []
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.job_id)
    const { data: jobs } = await supabaseBrowser
        .from('jobs')
        .select('id, slug, title, company, city, status')
        .in('id', ids)

    const byId = new Map((jobs || []).map((j) => [j.id, j]))
    return rows
        .map((r) => {
            const j = byId.get(r.job_id)
            if (!j) return null
            return {
                jobId: j.id,
                slug: j.slug,
                title: j.title,
                company: j.company,
                // Was `city === 'calgary' ? 'Calgary' : 'Edmonton'`, from when
                // those were the only two. The board now runs seven cities, so
                // that showed a Fort McMurray job as Edmonton on /account.
                city: JOB_CITY_LABELS[j.city as JobCity] ?? j.city,
                trackStatus: r.status as SavedJobStatus,
                notes: r.notes ?? null,
                jobStatus: j.status,
                savedAt: r.created_at,
            } as SavedJobCard
        })
        .filter((x): x is SavedJobCard => x !== null)
}
