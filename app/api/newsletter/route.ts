/**
 * Newsletter API Route
 * 
 * Performance optimizations:
 * - Efficient database queries
 * - Proper input validation
 * - No console.logs in production
 * - Proper error handling
 * 
 * Used by:
 * - Newsletter signup forms
 * - Admin panel for subscriber management
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST handler for newsletter subscription
 * 
 * Handles new subscriptions and re-subscriptions
 * 
 * @param request - Next.js request object with email, city, optIn, source
 * @returns JSON response indicating success or failure
 * 
 * Performance:
 * - Efficient email validation
 * - Single database query for existing email check
 * - Proper error handling
 */
export async function POST(request: NextRequest) {
  try {
    const { email, city, optIn, source } = await request.json()

    // Validate required fields
    if (!email || !city || !optIn) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      )
    }

    // Check if email already exists with timeout protection
    const checkQuery = supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', email)
      .single()
    
    const checkTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    )
    
    const { data: existingEmail, error: checkError } = await Promise.race([
      checkQuery,
      checkTimeout
    ]) as any

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking existing email:', checkError)
      }
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      )
    }

    if (existingEmail) {
      if (existingEmail.status === 'active') {
        return NextResponse.json(
          { error: 'Email already subscribed' },
          { status: 409 }
        )
      } else {
        // Re-subscribe if previously unsubscribed with timeout protection
        const updateQuery = supabase
          .from('newsletter_subscriptions')
          .update({ 
            status: 'active',
            city: city,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEmail.id)
        
        const updateTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Update timeout')), 5000)
        )
        
        const { error: updateError } = await Promise.race([
          updateQuery,
          updateTimeout
        ]) as any

        if (updateError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error reactivating subscription:', updateError)
          }
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          )
        }
        return NextResponse.json(
          { 
            success: true, 
            message: 'Successfully re-subscribed to newsletter'
          },
          { 
            status: 200,
            headers: {
              'Cache-Control': 'no-cache',
              'X-Content-Type-Options': 'nosniff'
            }
          }
        )
      }
    }

    // Insert new subscriber with timeout protection
    const insertQuery = supabase
      .from('newsletter_subscriptions')
      .insert([
        {
          email,
          city,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select('id, email, city, status, created_at')
    
    const insertTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Insert timeout')), 5000)
    )
    
    const { data, error: insertError } = await Promise.race([
      insertQuery,
      insertTimeout
    ]) as any

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Newsletter signup error:', insertError)
      }
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully subscribed to newsletter',
        subscriber: data?.[0] || { email, city, status: 'active' }
      },
      { 
        status: 201,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Newsletter API error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET handler for newsletter subscribers
 * 
 * Returns newsletter subscribers with server-side pagination, filtering, and sorting
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 10, max: 100)
 * - status: string - Filter by status (active, unsubscribed, etc.)
 * - city: string - Filter by city
 * - search: string - Search by email
 * - sortBy: string - Sort field: 'newest' | 'oldest' | 'email' (default: 'newest')
 * 
 * @returns JSON response with subscribers array and pagination metadata
 * 
 * Performance:
 * - Server-side pagination (default 10 items per page)
 * - Server-side filtering and sorting
 * - Minimal fields (only essential fields)
 * - Timeout protection
 * - Uses database indexes for fast queries
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized')
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters with defaults
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const status = searchParams.get('status') || ''
    const city = searchParams.get('city') || ''
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'newest'
    
    const offset = (page - 1) * limit
    
    // PERFORMANCE: Select only essential fields (reduces payload size)
    const essentialFields = [
      'id',
      'email',
      'city',
      'status',
      'created_at',
      'updated_at'
    ].join(',')
    
    // Build query with filters
    let query = supabase
      .from('newsletter_subscriptions')
      .select(essentialFields, { count: 'exact' })
    
    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    // Apply city filter
    if (city && city !== 'all') {
      query = query.eq('city', city)
    }
    
    // Apply search filter (email)
    if (search) {
      const searchPattern = `%${search}%`
      query = query.ilike('email', searchPattern)
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'email':
        query = query.order('email', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    
    // Execute query with timeout
    const queryPromise = query
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    )
    
    const { data, error, count } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Newsletter fetch error:', error)
      }
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    const totalPages = count ? Math.ceil(count / limit) : 1

    return NextResponse.json({
      subscribers: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Newsletter API error:', error)
    }
    return NextResponse.json(
      { 
        error: 'Internal server error',
        subscribers: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}
