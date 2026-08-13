import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, city, optIn, source, signupSource, signupPath } = body

    // Each topic is its own CASL express consent. Callers that predate topics
    // (footer form, inline CTAs) mean the culture list, which is what they have
    // always subscribed people to.
    const requestedTopics: string[] = Array.isArray(body.topics)
      ? body.topics.filter((t: unknown): t is string => t === 'culture' || t === 'jobs')
      : ['culture']
    if (requestedTopics.length === 0) {
      return NextResponse.json({ error: 'No valid topics supplied' }, { status: 400 })
    }

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

    // Block permanently bounced emails from subscribing or re-subscribing
    const { data: bounceEvent } = await supabase
      .from('newsletter_email_events')
      .select('id')
      .eq('email', email)
      .eq('event_type', 'bounced')
      .limit(1)
      .single()

    if (bounceEvent) {
      // Return a friendly success-like message so the form feels normal,
      // but do not actually subscribe the address.
      return NextResponse.json(
        { success: true, message: 'Successfully subscribed to newsletter' },
        { status: 200 }
      )
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status, topics')
      .eq('email', email)
      .single()

    if (existingEmail) {
      if (existingEmail.status === 'active') {
        // Already subscribed — but they may be consenting to a NEW list (a
        // culture reader ticking the jobs box). Add only what's missing.
        const current: string[] = existingEmail.topics ?? ['culture']
        const added = requestedTopics.filter(t => !current.includes(t))

        if (added.length === 0) {
          return NextResponse.json(
            { error: 'Email already subscribed' },
            { status: 409 }
          )
        }

        const { error: topicErr } = await supabase
          .from('newsletter_subscriptions')
          .update({ topics: [...current, ...added], updated_at: new Date().toISOString() })
          .eq('id', existingEmail.id)

        if (topicErr) {
          console.error('Error adding newsletter topics:', topicErr)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }
        return NextResponse.json(
          { success: true, message: `Subscribed to ${added.join(', ')}`, added },
          { status: 200 }
        )
      } else {
        // Re-subscribe if previously unsubscribed
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({
            status: 'active',
            city: city,
            topics: requestedTopics,
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
          topics: requestedTopics,
          // `source` has been arriving here since the form was built and had
          // nowhere to land until the attribution columns existed.
          signup_source: signupSource || source || null,
          signup_path: signupPath || null,
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

export async function PATCH(request: NextRequest) {
  try {
    const { email, status } = await request.json()

    if (!email || !status || !['active', 'unsubscribed'].includes(status)) {
      return NextResponse.json(
        { error: 'Missing or invalid fields. Provide email and status (active|unsubscribed)' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('email', email)

    if (error) {
      console.error('Newsletter update error:', error)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: `Subscription updated to ${status}` })
  } catch (error) {
    console.error('Newsletter PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
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
