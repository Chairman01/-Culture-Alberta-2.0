'use client'

import { supabaseBrowser } from '@/lib/supabase-browser'

/**
 * Browser helpers for the per-user article bookmarks (public.saved_articles).
 * All access is scoped to the signed-in user by row-level security.
 */

export async function isArticleSaved(articleId: string): Promise<boolean> {
    const { data } = await supabaseBrowser
        .from('saved_articles')
        .select('article_id')
        .eq('article_id', articleId)
        .maybeSingle()
    return !!data
}

export async function saveArticle(userId: string, articleId: string): Promise<void> {
    const { error } = await supabaseBrowser
        .from('saved_articles')
        .insert({ user_id: userId, article_id: articleId })
    // Ignore duplicate-key races (already saved).
    if (error && error.code !== '23505') throw error
}

export async function unsaveArticle(articleId: string): Promise<void> {
    const { error } = await supabaseBrowser
        .from('saved_articles')
        .delete()
        .eq('article_id', articleId)
    if (error) throw error
}

export interface SavedArticleCard {
    id: string
    slug: string | null
    title: string
    image: string | null
    savedAt: string
}

/** A user's saved articles, newest first, joined to article display fields. */
export async function listSavedArticles(): Promise<SavedArticleCard[]> {
    const { data: saved, error } = await supabaseBrowser
        .from('saved_articles')
        .select('article_id, created_at')
        .order('created_at', { ascending: false })
    if (error) throw error
    const rows = saved || []
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.article_id)
    const { data: articles } = await supabaseBrowser
        .from('articles')
        .select('id, slug, title, image, image_url')
        .in('id', ids)

    const byId = new Map((articles || []).map((a) => [a.id, a]))
    return rows
        .map((r) => {
            const a = byId.get(r.article_id)
            if (!a) return null
            return {
                id: a.id,
                slug: a.slug ?? null,
                title: a.title,
                image: a.image || a.image_url || null,
                savedAt: r.created_at,
            } as SavedArticleCard
        })
        .filter((x): x is SavedArticleCard => x !== null)
}
