import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Sanitize comment content
function sanitizeContent(content: string): string {
    // Remove HTML tags
    let sanitized = content.replace(/<[^>]*>/g, '')

    // Trim whitespace
    sanitized = sanitized.trim()

    // Limit length
    sanitized = sanitized.substring(0, 1000)

    return sanitized
}

// GET: Fetch approved comments for an article
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const articleId = searchParams.get('articleId')
        const limit = parseInt(searchParams.get('limit') || '10', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)

        if (!articleId) {
            return NextResponse.json(
                { error: 'Article ID is required' },
                { status: 400 }
            )
        }

        // Validate pagination parameters
        if (limit < 1 || limit > 50) {
            return NextResponse.json(
                { error: 'Limit must be between 1 and 50' },
                { status: 400 }
            )
        }

        if (offset < 0) {
            return NextResponse.json(
                { error: 'Offset must be non-negative' },
                { status: 400 }
            )
        }

        // Get total count of approved comments
        const { count, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId)
            .eq('status', 'approved')

        if (countError) {
            console.error('Error counting comments:', countError)
            return NextResponse.json(
                { error: 'Failed to count comments' },
                { status: 500 }
            )
        }

        // Fetch approved comments with pagination
        const { data: comments, error } = await supabase
            .from('comments')
            .select('id, author_name, content, created_at')
            .eq('article_id', articleId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

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
            limit,
            offset
        })
    } catch (error) {
        console.error('Error in GET /api/comments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: Submit a new comment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { articleId, authorName, authorEmail, content } = body

        // Validate required fields
        if (!articleId || !authorName || !content) {
            return NextResponse.json(
                { error: 'Article ID, author name, and content are required' },
                { status: 400 }
            )
        }

        // Validate author name length
        if (authorName.trim().length < 2 || authorName.trim().length > 100) {
            return NextResponse.json(
                { error: 'Name must be between 2 and 100 characters' },
                { status: 400 }
            )
        }

        // Validate content length
        if (content.trim().length < 3 || content.trim().length > 1000) {
            return NextResponse.json(
                { error: 'Comment must be between 3 and 1000 characters' },
                { status: 400 }
            )
        }

        // Validate email if provided
        if (authorEmail && authorEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(authorEmail)) {
                return NextResponse.json(
                    { error: 'Invalid email address' },
                    { status: 400 }
                )
            }
        }

        // Sanitize inputs
        const sanitizedName = authorName.trim().substring(0, 100)
        const sanitizedEmail = authorEmail?.trim().substring(0, 255) || null
        const sanitizedContent = sanitizeContent(content)

        // Get IP address for spam prevention
        const ipAddress = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        // Insert comment with 'pending' status
        console.log('📝 Attempting to insert comment:', {
            article_id: articleId,
            author_name: sanitizedName,
            author_email: sanitizedEmail,
            content_length: sanitizedContent.length,
            status: 'pending',
            ip_address: ipAddress,
        })

        const { data: comment, error } = await supabase
            .from('comments')
            .insert([
                {
                    article_id: articleId,
                    author_name: sanitizedName,
                    author_email: sanitizedEmail,
                    content: sanitizedContent,
                    status: 'pending',
                    ip_address: ipAddress,
                },
            ])
            .select()
            .single()

        if (error) {
            console.error('❌ Error inserting comment:')
            console.error('- Error object:', JSON.stringify(error, null, 2))
            console.error('- Error code:', error.code)
            console.error('- Error message:', error.message)
            console.error('- Error details:', error.details)
            console.error('- Error hint:', error.hint)
            return NextResponse.json(
                { error: 'Failed to submit comment', details: error.message },
                { status: 500 }
            )
        }

        console.log('✅ Comment inserted successfully:', comment)

        return NextResponse.json({
            success: true,
            message: 'Comment submitted successfully! It will appear after moderation.',
            comment,
        })
    } catch (error) {
        console.error('Error in POST /api/comments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
