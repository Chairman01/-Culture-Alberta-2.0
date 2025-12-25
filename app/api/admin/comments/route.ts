import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch all comments (admin only)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status') // 'pending', 'approved', 'rejected', or null for all
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = (page - 1) * limit

        let query = supabase
            .from('comments')
            .select('*, articles(title)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Filter by status if provided
        if (status) {
            query = query.eq('status', status)
        }

        const { data: comments, error, count } = await query

        if (error) {
            console.error('Error fetching comments:', error)
            return NextResponse.json(
                { error: 'Failed to fetch comments' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            comments: comments || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        })
    } catch (error) {
        console.error('Error in GET /api/admin/comments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH: Update comment status (approve/reject)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { commentId, status } = body

        // Validate inputs
        if (!commentId || !status) {
            return NextResponse.json(
                { error: 'Comment ID and status are required' },
                { status: 400 }
            )
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: pending, approved, or rejected' },
                { status: 400 }
            )
        }

        // Update comment status
        const { data: comment, error } = await supabase
            .from('comments')
            .update({ status })
            .eq('id', commentId)
            .select()
            .single()

        if (error) {
            console.error('Error updating comment:', error)
            return NextResponse.json(
                { error: 'Failed to update comment' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `Comment ${status} successfully`,
            comment,
        })
    } catch (error) {
        console.error('Error in PATCH /api/admin/comments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: Delete a comment
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const commentId = searchParams.get('commentId')

        if (!commentId) {
            return NextResponse.json(
                { error: 'Comment ID is required' },
                { status: 400 }
            )
        }

        // Delete comment
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)

        if (error) {
            console.error('Error deleting comment:', error)
            return NextResponse.json(
                { error: 'Failed to delete comment' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Comment deleted successfully',
        })
    } catch (error) {
        console.error('Error in DELETE /api/admin/comments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
