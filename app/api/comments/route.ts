import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendReplyEmail } from '@/lib/reply-email'

export const dynamic = 'force-dynamic'

// ---- sanitization helpers ----
function sanitizeContent(content: string): string {
    return content.replace(/<[^>]*>/g, '').trim().substring(0, 1000)
}

function sanitizeSingleLine(value: string, maxLength: number): string {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, maxLength)
}

interface CommentRow {
    id: string
    article_id: string
    author_name: string
    content: string
    created_at: string
    parent_id: string | null
    user_id: string | null
    like_count: number | null
}

// GET: approved top-level comments + their approved replies, with like metadata
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const articleId = searchParams.get('articleId')
        const clientId = searchParams.get('clientId') || ''
        const requestedLimit = parseInt(searchParams.get('limit') || '10', 10)
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10
        const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

        if (!articleId) {
            return NextResponse.json({ error: 'Article ID is required' }, { status: 400 })
        }

        // Count top-level approved comments for pagination
        const { count, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId)
            .eq('status', 'approved')
            .is('parent_id', null)

        if (countError) {
            console.error('[comments GET] count error:', countError)
            return NextResponse.json({ error: 'Failed to count comments' }, { status: 500 })
        }

        // Fetch the page of top-level comments
        const { data: topLevel, error: topErr } = await supabase
            .from('comments')
            .select('id, article_id, author_name, content, created_at, parent_id, user_id, like_count')
            .eq('article_id', articleId)
            .eq('status', 'approved')
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (topErr) {
            console.error('[comments GET] top-level error:', topErr)
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
        }

        const parents = (topLevel || []) as CommentRow[]
        const parentIds = parents.map((c) => c.id)

        // Fetch approved replies for this page of parents
        let replies: CommentRow[] = []
        if (parentIds.length > 0) {
            const { data: replyRows, error: replyErr } = await supabase
                .from('comments')
                .select('id, article_id, author_name, content, created_at, parent_id, user_id, like_count')
                .in('parent_id', parentIds)
                .eq('status', 'approved')
                .order('created_at', { ascending: true })
            if (replyErr) {
                console.error('[comments GET] replies error:', replyErr)
            } else {
                replies = (replyRows || []) as CommentRow[]
            }
        }

        // Determine which of these comments the current client has liked
        const allIds = [...parentIds, ...replies.map((r) => r.id)]
        const likedSet = new Set<string>()
        if (clientId && allIds.length > 0) {
            const { data: likedRows } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .eq('client_id', clientId)
                .in('comment_id', allIds)
            for (const row of likedRows || []) likedSet.add(row.comment_id)
        }

        const shape = (c: CommentRow) => ({
            id: c.id,
            author_name: c.author_name,
            content: c.content,
            created_at: c.created_at,
            parent_id: c.parent_id,
            is_member: !!c.user_id,
            like_count: c.like_count ?? 0,
            liked_by_client: likedSet.has(c.id),
        })

        const repliesByParent: Record<string, ReturnType<typeof shape>[]> = {}
        for (const r of replies) {
            if (!r.parent_id) continue
            ;(repliesByParent[r.parent_id] ||= []).push(shape(r))
        }

        const comments = parents.map((p) => ({
            ...shape(p),
            replies: repliesByParent[p.id] || [],
        }))

        return NextResponse.json({
            comments,
            total: count || 0,
            limit,
            offset,
        })
    } catch (error) {
        console.error('[comments GET] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST: create a comment (anonymous top-level) or reply (requires a logged-in account)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { articleId, content, parentId } = body

        if (!articleId || !content) {
            return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
        }

        const sanitizedContent = sanitizeContent(String(content))
        if (sanitizedContent.length < 3 || sanitizedContent.length > 1000) {
            return NextResponse.json(
                { error: 'Comment must be between 3 and 1000 characters' },
                { status: 400 }
            )
        }

        const ipAddress =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        // ---- Reply path: must be authenticated ----
        if (parentId) {
            const authHeader = request.headers.get('authorization') || ''
            const token = authHeader.toLowerCase().startsWith('bearer ')
                ? authHeader.slice(7).trim()
                : ''
            if (!token) {
                return NextResponse.json(
                    { error: 'You must be signed in to reply.' },
                    { status: 401 }
                )
            }

            const { data: userData, error: userErr } = await supabase.auth.getUser(token)
            if (userErr || !userData?.user) {
                return NextResponse.json(
                    { error: 'Your session has expired. Please sign in again.' },
                    { status: 401 }
                )
            }

            // Validate the parent exists, is approved, and belongs to this article
            const { data: parent, error: parentErr } = await supabase
                .from('comments')
                .select('id, article_id, status, parent_id, user_id')
                .eq('id', parentId)
                .single()
            if (parentErr || !parent || parent.article_id !== articleId || parent.status !== 'approved') {
                return NextResponse.json({ error: 'Comment to reply to was not found' }, { status: 404 })
            }

            const meta = userData.user.user_metadata as { full_name?: string } | null
            const displayName = sanitizeSingleLine(
                String(meta?.full_name || userData.user.email || 'Member'),
                100
            )

            const { data: reply, error: insertErr } = await supabase
                .from('comments')
                .insert([
                    {
                        article_id: articleId,
                        author_name: displayName,
                        author_email: userData.user.email ?? null,
                        content: sanitizedContent,
                        status: 'approved',
                        parent_id: parentId,
                        user_id: userData.user.id,
                        ip_address: ipAddress,
                    },
                ])
                .select('id, author_name, content, created_at, parent_id, user_id, like_count')
                .single()

            if (insertErr) {
                console.error('[comments POST reply] insert error:', insertErr)
                return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
            }

            // Email the parent author (the in-app notification is created by a DB
            // trigger). Best-effort: never let an email failure break the reply.
            if (parent.user_id && parent.user_id !== userData.user.id) {
                try {
                    await sendReplyEmail({
                        recipientUserId: parent.user_id,
                        actorName: displayName,
                        excerpt: sanitizedContent,
                        articleId: articleId,
                    })
                } catch (mailErr) {
                    console.error('[comments POST reply] email error:', mailErr)
                }
            }

            return NextResponse.json({
                success: true,
                comment: {
                    id: reply.id,
                    author_name: reply.author_name,
                    content: reply.content,
                    created_at: reply.created_at,
                    parent_id: reply.parent_id,
                    is_member: true,
                    like_count: reply.like_count ?? 0,
                    liked_by_client: false,
                    replies: [],
                },
            })
        }

        // ---- Top-level member path: if a valid token is present, post as a signed-in member ----
        const topAuthHeader = request.headers.get('authorization') || ''
        const topToken = topAuthHeader.toLowerCase().startsWith('bearer ')
            ? topAuthHeader.slice(7).trim()
            : ''
        if (topToken) {
            const { data: userData, error: userErr } = await supabase.auth.getUser(topToken)
            if (!userErr && userData?.user) {
                const meta = userData.user.user_metadata as { full_name?: string } | null
                const displayName = sanitizeSingleLine(
                    String(meta?.full_name || userData.user.email || 'Member'),
                    100
                )
                const { data: memberComment, error: memberErr } = await supabase
                    .from('comments')
                    .insert([
                        {
                            article_id: articleId,
                            author_name: displayName,
                            author_email: userData.user.email ?? null,
                            content: sanitizedContent,
                            status: 'approved',
                            user_id: userData.user.id,
                            ip_address: ipAddress,
                        },
                    ])
                    .select('id, author_name, content, created_at, parent_id, user_id, like_count')
                    .single()

                if (memberErr) {
                    console.error('[comments POST member] insert error:', memberErr)
                    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 })
                }

                return NextResponse.json({
                    success: true,
                    comment: {
                        id: memberComment.id,
                        author_name: memberComment.author_name,
                        content: memberComment.content,
                        created_at: memberComment.created_at,
                        parent_id: memberComment.parent_id,
                        is_member: true,
                        like_count: memberComment.like_count ?? 0,
                        liked_by_client: false,
                        replies: [],
                    },
                })
            }
        }

        // ---- No valid account: commenting now requires a (free) account ----
        return NextResponse.json(
            { error: 'Please create an account or sign in to comment.' },
            { status: 401 }
        )
    } catch (error) {
        console.error('[comments POST] unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
