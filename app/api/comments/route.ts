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

function sanitizeSingleLine(value: string, maxLength: number): string {
    return value
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLength)
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// GET: Fetch approved comments for an article
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const articleId = searchParams.get('articleId')
        const requestedLimit = parseInt(searchParams.get('limit') || '3', 10)
        const limit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 3) : 3
        const offset = parseInt(searchParams.get('offset') || '0', 10)

        console.log('📥 GET /api/comments - Request received:', {
            articleId,
            limit,
            offset
        })

        if (!articleId) {
            console.warn('❌ GET /api/comments - Missing article ID')
            return NextResponse.json(
                { error: 'Article ID is required' },
                { status: 400 }
            )
        }

        // Validate pagination parameters
        if (limit < 1 || limit > 50) {
            console.warn('❌ GET /api/comments - Invalid limit:', limit)
            return NextResponse.json(
                { error: 'Limit must be between 1 and 50' },
                { status: 400 }
            )
        }

        if (offset < 0) {
            console.warn('❌ GET /api/comments - Invalid offset:', offset)
            return NextResponse.json(
                { error: 'Offset must be non-negative' },
                { status: 400 }
            )
        }

        // Get total count of approved comments
        console.log('🔍 Counting comments for article:', articleId)
        const { count, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId)
            .eq('status', 'approved')

        if (countError) {
            console.error('❌ Error counting comments:')
            console.error('- Article ID:', articleId)
            console.error('- Error code:', countError.code)
            console.error('- Error message:', countError.message)
            console.error('- Error details:', countError.details)
            console.error('- Error hint:', countError.hint)
            console.error('- Full error:', JSON.stringify(countError, null, 2))
            return NextResponse.json(
                { error: 'Failed to count comments', details: countError.message },
                { status: 500 }
            )
        }

        console.log('✅ Comment count:', count)

        // Fetch approved comments with pagination
        console.log('🔍 Fetching comments...')
        const { data: comments, error } = await supabase
            .from('comments')
            .select('id, author_name, content, created_at')
            .eq('article_id', articleId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('❌ Error fetching comments:')
            console.error('- Article ID:', articleId)
            console.error('- Error code:', error.code)
            console.error('- Error message:', error.message)
            console.error('- Error details:', error.details)
            console.error('- Error hint:', error.hint)
            console.error('- Full error:', JSON.stringify(error, null, 2))
            return NextResponse.json(
                { error: 'Failed to fetch comments', details: error.message },
                { status: 500 }
            )
        }

        console.log('✅ Comments fetched successfully:', comments?.length || 0)

        return NextResponse.json({
            comments: comments || [],
            total: count || 0,
            limit,
            offset
        })
    } catch (error) {
        console.error('❌ Unexpected error in GET /api/comments:')
        console.error('- Error type:', typeof error)
        console.error('- Error:', error)
        console.error('- Stack:', error instanceof Error ? error.stack : 'N/A')
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
                { error: 'Name and comment are required' },
                { status: 400 }
            )
        }

        const sanitizedAuthorName = sanitizeSingleLine(String(authorName), 100)
        const sanitizedAuthorEmail = typeof authorEmail === 'string' && authorEmail.trim()
            ? sanitizeSingleLine(authorEmail, 255)
            : null
        const sanitizedContent = sanitizeContent(String(content))

        if (!sanitizedAuthorName) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        if (sanitizedAuthorEmail && !isValidEmail(sanitizedAuthorEmail)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address' },
                { status: 400 }
            )
        }

        // Validate content length
        if (sanitizedContent.length < 3 || sanitizedContent.length > 1000) {
            return NextResponse.json(
                { error: 'Comment must be between 3 and 1000 characters' },
                { status: 400 }
            )
        }

        // Get IP address for spam prevention
        const ipAddress = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        // Insert comment with 'pending' status
        console.log('📝 Attempting to insert comment:', {
            article_id: articleId,
            author_name: sanitizedAuthorName,
            author_email: sanitizedAuthorEmail,
            content_length: sanitizedContent.length,
            status: 'pending',
        })

        const { data: comment, error } = await supabase
            .from('comments')
            .insert([
                {
                    article_id: articleId,
                    author_name: sanitizedAuthorName,
                    author_email: sanitizedAuthorEmail,
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
