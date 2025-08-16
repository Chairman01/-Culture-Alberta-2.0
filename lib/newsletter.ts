import { supabase } from './supabase'

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
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbznviaszgqfxhk.supabase.co')
    console.log('Supabase Key:', process.env.EXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set from env' : 'Not set')
    
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

    const stats = {
      total: data?.length || 0,
      active: data?.filter(sub => sub.status === 'active').length || 0,
      unsubscribed: data?.filter(sub => sub.status === 'unsubscribed').length || 0,
      byCity: {
        calgary: data?.filter(sub => sub.city === 'calgary' && sub.status === 'active').length || 0,
        edmonton: data?.filter(sub => sub.city === 'edmonton' && sub.status === 'active').length || 0,
        'other-alberta': data?.filter(sub => sub.city === 'other-alberta' && sub.status === 'active').length || 0,
        'outside-alberta': data?.filter(sub => sub.city === 'outside-alberta' && sub.status === 'active').length || 0,
      }
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
