import { supabase } from './supabase'

// ── Engagement tracking interfaces ────────────────────────────────────────────

export interface EmailEvent {
  id?: string
  email: string
  event_type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  email_id?: string
  subject?: string
  clicked_url?: string
  created_at?: string
}

export interface CampaignStat {
  subject: string
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  open_rate: number
  click_rate: number
  sent_at: string
}

export interface SubscriberEngagement {
  email: string
  total_opens: number
  total_clicks: number
  last_opened?: string
  last_clicked?: string
  bounced: boolean
  complained: boolean
}

// ── Subscription interfaces ────────────────────────────────────────────────────

export interface NewsletterSubscription {
  id?: string
  email: string
  city: string
  province?: string
  country?: string
  created_at?: string
  status?: 'active' | 'unsubscribed'
}

// Subscribe to newsletter
export async function subscribeToNewsletter(email: string, city: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    console.log('Attempting to subscribe:', { email, city })

    // Check if email already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', email)
      .single()

    console.log('Check existing subscription result:', { existingSubscription, checkError })

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // No existing subscription found, continue with insert
        console.log('No existing subscription found, proceeding with insert')
      } else {
        console.error('Error checking existing subscription:', checkError)
        throw new Error(`Database error: ${checkError.message}`)
      }
    }

    if (existingSubscription) {
      if (existingSubscription.status === 'active') {
        return { success: false, error: 'Email already subscribed' }
      } else {
        // Re-subscribe if previously unsubscribed
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({ 
            status: 'active',
            city: city,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)

        if (error) {
          console.error('Error reactivating subscription:', error)
          throw error
        }
        return { success: true }
      }
    }

    // Create new subscription
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .insert([
        {
          email,
          city,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])

    if (error) {
      console.error('Error inserting subscription:', error)
      throw error
    }
    
    console.log('Successfully subscribed to newsletter')
    return { success: true }
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to subscribe' 
    }
  }
}

// Get all newsletter subscriptions (for admin)
export async function getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
  try {
    if (!supabase) return []
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching newsletter subscriptions:', error)
    return []
  }
}

// Unsubscribe from newsletter
export async function unsubscribeFromNewsletter(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'unsubscribed' })
      .eq('email', email)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
    }
  }
}

// Test database connection and table existence
export async function testNewsletterConnection(): Promise<{ success: boolean; error?: string; tableExists?: boolean }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    console.log('Testing newsletter database connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co')
    
    // Try to query the table
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('count')
      .limit(1)

    console.log('Query result:', { data, error })

    if (error) {
      console.error('Database connection test error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return { 
        success: false, 
        error: error.message || 'Table does not exist',
        tableExists: false
      }
    }

    console.log('Database connection successful, table exists')
    return { success: true, tableExists: true }
  } catch (error) {
    console.error('Test connection error:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      tableExists: false
    }
  }
}

// Get subscription statistics
export async function getNewsletterStats() {
  try {
    if (!supabase) {
      console.error('Supabase not configured for newsletter stats')
      return null
    }
    
    console.log('Fetching newsletter stats...')
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('status, city')

    if (error) {
      console.error('Supabase error fetching stats:', error)
      throw error
    }

    console.log('Raw newsletter data:', data)

    const activeData = data?.filter(sub => sub.status === 'active') || []

    // All known city values (matches NEWSLETTER_CITIES in lib/newsletter-cities.ts)
    const KNOWN_CITIES = [
      'edmonton', 'calgary', 'lethbridge',
      'red-deer', 'grande-prairie', 'medicine-hat',
      'other-alberta', 'outside-alberta', 'other',
    ]

    const byCity: Record<string, number> = {}
    for (const c of KNOWN_CITIES) {
      byCity[c] = activeData.filter(sub => sub.city === c).length
    }

    // Catch any city value not in the list above
    const unknownCount = activeData.filter(sub => !KNOWN_CITIES.includes(sub.city)).length
    if (unknownCount > 0) byCity['unknown'] = unknownCount

    const stats = {
      total: data?.length || 0,
      active: activeData.length,
      unsubscribed: data?.filter(sub => sub.status === 'unsubscribed').length || 0,
      byCity,
    }

    console.log('Processed newsletter stats:', stats)
    return stats
  } catch (error) {
    console.error('Error fetching newsletter stats:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error,
      constructor: error?.constructor?.name
    })
    return null
  }
}

// ── Engagement tracking functions ─────────────────────────────────────────────

export async function getEmailEvents(): Promise<EmailEvent[]> {
  try {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('newsletter_email_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching email events:', error)
    return []
  }
}

export function computeCampaignStats(events: EmailEvent[]): CampaignStat[] {
  const campaigns: Record<string, { delivered: Set<string>; opened: Set<string>; clicked: Set<string>; bounced: Set<string>; complained: Set<string>; first_at: string }> = {}

  for (const ev of events) {
    if (!ev.subject) continue
    if (!campaigns[ev.subject]) {
      campaigns[ev.subject] = {
        delivered: new Set(), opened: new Set(), clicked: new Set(),
        bounced: new Set(), complained: new Set(),
        first_at: ev.created_at || '',
      }
    }
    const c = campaigns[ev.subject]
    if (ev.event_type === 'delivered') c.delivered.add(ev.email)
    if (ev.event_type === 'opened')    c.opened.add(ev.email)
    if (ev.event_type === 'clicked')   c.clicked.add(ev.email)
    if (ev.event_type === 'bounced')   c.bounced.add(ev.email)
    if (ev.event_type === 'complained') c.complained.add(ev.email)
    if (ev.created_at && ev.created_at < c.first_at) c.first_at = ev.created_at
  }

  return Object.entries(campaigns)
    .map(([subject, c]) => {
      const delivered = c.delivered.size
      const opened    = c.opened.size
      const clicked   = c.clicked.size
      return {
        subject, delivered, opened, clicked,
        bounced: c.bounced.size, complained: c.complained.size,
        open_rate:  delivered > 0 ? Math.round((opened  / delivered) * 100) : 0,
        click_rate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
        sent_at: c.first_at,
      }
    })
    .sort((a, b) => b.sent_at.localeCompare(a.sent_at))
}

export function computeSubscriberEngagement(events: EmailEvent[]): Record<string, SubscriberEngagement> {
  const engagement: Record<string, SubscriberEngagement> = {}
  for (const ev of events) {
    if (!engagement[ev.email]) {
      engagement[ev.email] = { email: ev.email, total_opens: 0, total_clicks: 0, bounced: false, complained: false }
    }
    const e = engagement[ev.email]
    if (ev.event_type === 'opened') {
      e.total_opens++
      if (!e.last_opened || (ev.created_at && ev.created_at > e.last_opened)) e.last_opened = ev.created_at
    }
    if (ev.event_type === 'clicked') {
      e.total_clicks++
      if (!e.last_clicked || (ev.created_at && ev.created_at > e.last_clicked)) e.last_clicked = ev.created_at
    }
    if (ev.event_type === 'bounced')    e.bounced = true
    if (ev.event_type === 'complained') e.complained = true
  }
  return engagement
}
