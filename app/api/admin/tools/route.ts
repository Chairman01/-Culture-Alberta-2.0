import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface ToolAgg {
    tool_slug: string
    uses: number
    users: number
    likes: number
    helpful_yes: number
    helpful_no: number
    notes: { note: string; helpful: boolean; created_at: string }[]
}

// GET — per-tool engagement aggregates (admin only).
export async function GET(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const supabase = getServiceClient()
        const tools: Record<string, ToolAgg> = {}

        const ensure = (slug: string): ToolAgg =>
            (tools[slug] ||= {
                tool_slug: slug,
                uses: 0,
                users: 0,
                likes: 0,
                helpful_yes: 0,
                helpful_no: 0,
                notes: [],
            })

        // Usage: total rows + distinct client_id per tool
        const usersByTool: Record<string, Set<string>> = {}
        const { data: usage, error: usageErr } = await supabase
            .from('tool_usage')
            .select('tool_slug, client_id')
            .limit(100000)
        if (usageErr) {
            console.error('[admin/tools] usage error:', usageErr)
        } else {
            for (const row of usage || []) {
                const agg = ensure(row.tool_slug)
                agg.uses += 1
                const set = (usersByTool[row.tool_slug] ||= new Set())
                if (row.client_id) set.add(row.client_id)
            }
            for (const slug of Object.keys(usersByTool)) {
                ensure(slug).users = usersByTool[slug].size
            }
        }

        // Likes
        const { data: likes, error: likesErr } = await supabase
            .from('tool_likes')
            .select('tool_slug')
            .limit(100000)
        if (likesErr) {
            console.error('[admin/tools] likes error:', likesErr)
        } else {
            for (const row of likes || []) ensure(row.tool_slug).likes += 1
        }

        // Feedback (helpful counts + recent notes)
        const { data: feedback, error: fbErr } = await supabase
            .from('tool_feedback')
            .select('tool_slug, helpful, note, created_at')
            .order('created_at', { ascending: false })
            .limit(100000)
        if (fbErr) {
            console.error('[admin/tools] feedback error:', fbErr)
        } else {
            for (const row of feedback || []) {
                const agg = ensure(row.tool_slug)
                if (row.helpful) agg.helpful_yes += 1
                else agg.helpful_no += 1
                if (row.note && agg.notes.length < 20) {
                    agg.notes.push({ note: row.note, helpful: row.helpful, created_at: row.created_at })
                }
            }
        }

        const result = Object.values(tools).sort((a, b) => b.uses - a.uses)
        return NextResponse.json({ tools: result })
    } catch (error) {
        console.error('[admin/tools] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
