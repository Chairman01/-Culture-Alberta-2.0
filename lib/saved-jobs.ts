'use client'

import { supabaseBrowser } from '@/lib/supabase-browser'
import type { SavedJobStatus } from '@/lib/types/job'

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
                city: j.city === 'calgary' ? 'Calgary' : 'Edmonton',
                trackStatus: r.status as SavedJobStatus,
                notes: r.notes ?? null,
                jobStatus: j.status,
                savedAt: r.created_at,
            } as SavedJobCard
        })
        .filter((x): x is SavedJobCard => x !== null)
}
