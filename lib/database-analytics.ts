import { supabase } from './supabase'

// Types for analytics data
export interface AnalyticsEvent {
  event_type: string
  page_path?: string
  page_title?: string
  session_id: string
  user_agent?: string
  referrer?: string
  ip_address?: string
  country?: string
  city?: string
  region?: string
  device_type?: string
  browser?: string
  os?: string
  screen_resolution?: string
  language?: string
}

export interface PageView {
  session_id: string
  page_path: string
  page_title?: string
  time_on_page?: number
  scroll_depth?: number
}

export interface ContentView {
  session_id: string
  content_type: string
  content_id?: string
  content_title?: string
  location?: string
  time_spent?: number
}

export interface Session {
  id: string
  user_agent?: string
  ip_address?: string
  country?: string
  city?: string
  region?: string
  device_type?: string
  browser?: string
  os?: string
  language?: string
  page_count?: number
  duration?: number
}

// Generate a unique session ID
export const generateSessionId = (): string => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Get device and browser information
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return {}
  
  const userAgent = navigator.userAgent
  const language = navigator.language
  const screenRes = `${screen.width}x${screen.height}`
  
  // Simple device detection
  let deviceType = 'desktop'
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'mobile'
  }
  
  // Simple browser detection
  let browser = 'Unknown'
  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'
  
  // Simple OS detection
  let os = 'Unknown'
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS')) os = 'iOS'
  
  return {
    user_agent: userAgent,
    device_type: deviceType,
    browser,
    os,
    screen_resolution: screenRes,
    language
  }
}

// Check if analytics tables exist
export const checkAnalyticsTables = async () => {
  try {
    if (!supabase) {
      console.warn('Supabase not available')
      return false
    }

    console.log('Checking if analytics tables exist...')

    // Try to query the analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message && error.message.includes('relation "analytics_events" does not exist')) {
        console.error('❌ ANALYTICS TABLES NOT FOUND!')
        console.error('Please run this SQL in your Supabase SQL Editor:')
        console.error(`
-- Create analytics tables for Culture Alberta
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  page_path TEXT,
  page_title TEXT,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_on_page INTEGER,
  scroll_depth INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  language TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_count INTEGER DEFAULT 1,
  duration INTEGER
);

CREATE TABLE IF NOT EXISTS analytics_content_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT,
  content_title TEXT,
  location TEXT,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `)
        return false
      }
      console.error('Error checking analytics tables:', error)
      return false
    }

    console.log('✅ Analytics tables exist and are accessible')
    return true
  } catch (error) {
    console.error('Error checking analytics tables:', error)
    return false
  }
}

// Track analytics event in database
export const trackAnalyticsEvent = async (event: AnalyticsEvent) => {
  try {
    if (!supabase) {
      console.warn('Supabase not available, falling back to localStorage')
      return false
    }

    // Check if tables exist first
    const tablesExist = await checkAnalyticsTables()
    if (!tablesExist) {
      return false
    }

    const deviceInfo = getDeviceInfo()
    const eventData = {
      ...event,
      ...deviceInfo,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert([eventData])

    if (error) {
      console.error('Error tracking analytics event:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking analytics event:', error)
    return false
  }
}

// Track page view in database
export const trackPageView = async (pageView: PageView) => {
  try {
    if (!supabase) {
      console.warn('Supabase not available, falling back to localStorage')
      return false
    }

    const { error } = await supabase
      .from('analytics_page_views')
      .insert([{
        ...pageView,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error tracking page view:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking page view:', error)
    return false
  }
}

// Track content view in database
export const trackContentView = async (contentView: ContentView) => {
  try {
    if (!supabase) {
      console.warn('Supabase not available, falling back to localStorage')
      return false
    }

    const { error } = await supabase
      .from('analytics_content_views')
      .insert([{
        ...contentView,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error tracking content view:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking content view:', error)
    return false
  }
}

// Create or update session in database
export const trackSession = async (session: Session) => {
  try {
    if (!supabase) {
      console.warn('Supabase not available, falling back to localStorage')
      return false
    }

    // Check if tables exist first
    const tablesExist = await checkAnalyticsTables()
    if (!tablesExist) {
      return false
    }

    console.log('Attempting to track session:', session.id)

    // Check if session exists
    const { data: existingSession, error: selectError } = await supabase
      .from('analytics_sessions')
      .select('id')
      .eq('id', session.id)
      .single()

    if (selectError) {
      if (selectError.code === 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new sessions
        console.log('Session not found, creating new session')
      } else {
        console.error('Error checking existing session:', selectError)
        return false
      }
    }

    if (existingSession) {
      console.log('Updating existing session')
      // Update existing session
      const { error } = await supabase
        .from('analytics_sessions')
        .update({
          page_count: session.page_count,
          duration: session.duration,
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (error) {
        console.error('Error updating session:', error)
        return false
      }
    } else {
             console.log('Creating new session')
       // Create new session
       const deviceInfo = getDeviceInfo()
       const sessionData = {
         id: session.id,
         page_count: session.page_count || 1,
         duration: session.duration || 0,
         started_at: new Date().toISOString(),
         ...deviceInfo
       }

       // Validate session data
       console.log('Device info:', deviceInfo)
       console.log('Session data before insert:', JSON.stringify(sessionData, null, 2))
       
       // Check for any undefined or null values that might cause issues
       const cleanSessionData = Object.fromEntries(
         Object.entries(sessionData).filter(([key, value]) => value !== undefined && value !== null)
       )
       
       console.log('Clean session data:', JSON.stringify(cleanSessionData, null, 2))

             console.log('Session data to insert:', cleanSessionData)

       const { data, error } = await supabase
         .from('analytics_sessions')
         .insert([cleanSessionData])
         .select()

       if (error) {
         console.error('Error creating session:', error)
         console.error('Error details:', {
           message: error.message,
           details: error.details,
           hint: error.hint,
           code: error.code
         })
         console.error('Full error object:', JSON.stringify(error, null, 2))
         return false
       }

       console.log('Session created successfully:', data)
    }

    console.log('Session tracked successfully')
    return true
  } catch (error) {
    console.error('Error tracking session:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Get analytics data for dashboard
export const getAnalyticsData = async () => {
  try {
    if (!supabase) {
      console.warn('Supabase not available, returning null')
      return null
    }

    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get total page views
    const { data: totalViews, error: totalError } = await supabase
      .from('analytics_page_views')
      .select('id')

    if (totalError) {
      console.error('Error getting total views:', totalError)
      return null
    }

    // Get weekly page views
    const { data: weeklyViews, error: weeklyError } = await supabase
      .from('analytics_page_views')
      .select('id')
      .gte('created_at', lastWeek.toISOString())

    if (weeklyError) {
      console.error('Error getting weekly views:', weeklyError)
      return null
    }

    // Get daily page views
    const { data: dailyViews, error: dailyError } = await supabase
      .from('analytics_page_views')
      .select('id')
      .gte('created_at', lastDay.toISOString())

    if (dailyError) {
      console.error('Error getting daily views:', dailyError)
      return null
    }

    // Get unique sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('analytics_sessions')
      .select('id')

    if (sessionsError) {
      console.error('Error getting sessions:', sessionsError)
      return null
    }

    // Get popular pages (last 30 days)
    const { data: popularPages, error: pagesError } = await supabase
      .from('analytics_page_views')
      .select('page_path, page_title')
      .gte('created_at', lastMonth.toISOString())

    if (pagesError) {
      console.error('Error getting popular pages:', pagesError)
      return null
    }

    // Count page visits
    const pageCounts: { [key: string]: number } = {}
    popularPages?.forEach((page) => {
      const path = page.page_path
      pageCounts[path] = (pageCounts[path] || 0) + 1
    })

    const sortedPages = Object.entries(pageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({
        name: getPageDisplayName(path),
        visits: count,
        path
      }))

    // Get content stats
    const { data: contentViews, error: contentError } = await supabase
      .from('analytics_content_views')
      .select('content_type, content_id')

    if (contentError) {
      console.error('Error getting content views:', contentError)
      return null
    }

    const contentStats = {
      articles: contentViews?.filter(v => v.content_type === 'article').length || 0,
      events: contentViews?.filter(v => v.content_type === 'event').length || 0,
      bestOf: contentViews?.filter(v => v.content_type === 'best_of').length || 0,
      edmonton: contentViews?.filter(v => v.content_type === 'location' && v.content_id === 'edmonton').length || 0,
      calgary: contentViews?.filter(v => v.content_type === 'location' && v.content_id === 'calgary').length || 0,
    }

    return {
      totalVisits: totalViews?.length || 0,
      weeklyVisits: weeklyViews?.length || 0,
      dailyVisits: dailyViews?.length || 0,
      uniqueSessions: sessions?.length || 0,
      popularPages: sortedPages,
      contentStats
    }
  } catch (error) {
    console.error('Error getting analytics data:', error)
    return null
  }
}

// Helper function to get display names for pages
const getPageDisplayName = (path: string): string => {
  if (path === '/') return 'Homepage'
  if (path === '/edmonton') return 'Edmonton'
  if (path === '/calgary') return 'Calgary'
  if (path === '/food-drink') return 'Food & Drink'
  if (path === '/events') return 'Events'
  if (path === '/best-of') return 'Best of Alberta'
  if (path === '/about') return 'About'
  if (path.startsWith('/articles/')) {
    const parts = path.split('/')
    return `Article: ${parts[parts.length - 1]}`
  }
  return path.charAt(1).toUpperCase() + path.slice(2)
}
