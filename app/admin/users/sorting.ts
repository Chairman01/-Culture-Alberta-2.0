/**
 * Sorting and search helpers for the members admin view.
 *
 * Pulled out of the component so the comparison rules can be exercised
 * directly — the page sits behind admin auth, which makes the sorted output
 * awkward to check in a browser.
 */

export type SortKey = 'joined' | 'signin' | 'name' | 'city' | 'comments' | 'saved'
export type SortDir = 'asc' | 'desc'

export interface SortableUser {
    name: string | null
    email: string | null
    cityLabel: string
    provider: string
    created_at?: string
    last_sign_in_at: string | null
    comments: number
    saved: number
}

/** Default direction per column: dates and counts read high-to-low, text A–Z. */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
    joined: 'desc', signin: 'desc', comments: 'desc', saved: 'desc', name: 'asc', city: 'asc',
}

function time(iso?: string | null): number {
    if (!iso) return 0
    const t = new Date(iso).getTime()
    return Number.isNaN(t) ? 0 : t
}

export function compare(a: SortableUser, b: SortableUser, key: SortKey): number {
    switch (key) {
        case 'joined': return time(a.created_at) - time(b.created_at)
        case 'signin': return time(a.last_sign_in_at) - time(b.last_sign_in_at)
        case 'comments': return (a.comments || 0) - (b.comments || 0)
        case 'saved': return (a.saved || 0) - (b.saved || 0)
        case 'city': return a.cityLabel.localeCompare(b.cityLabel)
        case 'name':
        default: return (a.name || a.email || '').localeCompare(b.name || b.email || '')
    }
}

/**
 * Sort a copy of the list. Members who have never signed in are pinned to the
 * bottom regardless of direction — a null sign-in is "no data", not "the oldest
 * sign-in", and letting it sort as epoch 0 would put every dormant account at
 * the top of "least recent first".
 */
export function sortUsers<T extends SortableUser>(users: T[], key: SortKey, dir: SortDir): T[] {
    const sign = dir === 'asc' ? 1 : -1
    return [...users].sort((a, b) => {
        if (key === 'signin') {
            const aNever = !a.last_sign_in_at
            const bNever = !b.last_sign_in_at
            if (aNever !== bNever) return aNever ? 1 : -1
        }
        return compare(a, b, key) * sign
    })
}

/** Free-text match across the fields shown in the table. */
export function matchesQuery(u: SortableUser, query: string): boolean {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${u.name ?? ''} ${u.email ?? ''} ${u.cityLabel} ${u.provider}`.toLowerCase().includes(q)
}
