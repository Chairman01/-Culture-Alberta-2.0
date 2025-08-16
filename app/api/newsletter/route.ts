import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Check if supabase client is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existingEmail) {
      if (existingEmail.status === 'active') {
        return NextResponse.json(
          { error: 'Email already subscribed' },
          { status: 409 }
        )
      } else {
        // Re-subscribe if previously unsubscribed
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({ 
            status: 'active',
            city: city,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEmail.id)

        if (error) {
          console.error('Error reactivating subscription:', error)
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
          { status: 200 }
        )
      }
    }

    // Insert new subscriber
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .insert([
        {
          email,
          city,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Newsletter signup error:', error)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully subscribed to newsletter',
        subscriber: data[0]
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Newsletter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check if supabase client is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Newsletter fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscribers: data })
  } catch (error) {
    console.error('Newsletter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
