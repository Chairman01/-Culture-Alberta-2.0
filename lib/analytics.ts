// Analytics utility for tracking user interactions
import { 
  trackAnalyticsEvent as trackDBEvent,
  trackPageView as trackDBPageView,
  trackContentView as trackDBContentView,
  trackSession as trackDBSession,
  generateSessionId,
  getAnalyticsData as getDBAnalyticsData
} from './database-analytics'

export interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
}

export interface PageView {
  path: string
  title: string
  timestamp: Date
  sessionId?: string
}

export interface ContentView {
  type: string
  id: string
  title: string
  timestamp: Date
  location?: string
}

// Generate a session ID for tracking user sessions
const getSessionId = () => {
  if (typeof window === 'undefined') return null
  
  let sessionId = localStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Track page views with enhanced data
export const trackPageView = async (path: string, title: string) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'G-V7DK0G3JFV', {
        page_path: path,
        page_title: title,
      })
    }
    
    const sessionId = getSessionId()
    if (!sessionId) return
    
    // Track in database (with error handling)
    try {
      await trackDBPageView({
        session_id: sessionId,
        page_path: path,
        page_title: title
      })
    } catch (error) {
      console.warn('Failed to track page view in database:', error)
    }
    
    // Track session (with error handling)
    try {
      await trackDBSession({
        id: sessionId,
        page_count: 1 // Will be updated by session tracking
      })
    } catch (error) {
      console.warn('Failed to track session in database:', error)
    }
    
    // Track analytics event (with error handling)
    try {
      await trackDBEvent({
        event_type: 'page_view',
        page_path: path,
        page_title: title,
        session_id: sessionId
      })
    } catch (error) {
      console.warn('Failed to track analytics event in database:', error)
    }
    
    // Track content type based on path (with error handling)
    try {
      if (path.includes('/edmonton')) {
        await trackContentView('location', 'edmonton', 'Edmonton Page')
      } else if (path.includes('/calgary')) {
        await trackContentView('location', 'calgary', 'Calgary Page')
      } else if (path.includes('/articles/')) {
        await trackContentView('article', path.split('/').pop() || '', title)
      } else if (path.includes('/events')) {
        await trackContentView('event', 'events', 'Events Page')
      } else if (path.includes('/best-of')) {
        await trackContentView('bestOf', 'best-of', 'Best of Alberta')
      }
    } catch (error) {
      console.warn('Failed to track content view in database:', error)
    }
  } catch (error) {
    console.warn('Analytics tracking failed:', error)
  }
}

// Track content views specifically
export const trackContentView = async (type: string, id: string, title: string, location?: string) => {
  const sessionId = getSessionId()
  if (!sessionId) return
  
  await trackDBContentView({
    session_id: sessionId,
    content_type: type,
    content_id: id,
    content_title: title,
    location
  })
}

// Track custom events
export const trackEvent = async (event: AnalyticsEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    })
  }
  
  const sessionId = getSessionId()
  if (!sessionId) return
  
  await trackDBEvent({
    event_type: event.action,
    session_id: sessionId,
    page_title: event.label
  })
}

// Get comprehensive analytics data for dashboard
export const getAnalyticsData = async () => {
  // Try to get data from database first
  const dbData = await getDBAnalyticsData()
  if (dbData) {
    return dbData
  }
  
  // Fallback to localStorage if database is not available
  if (typeof window === 'undefined') return null
  
  const pageViews = JSON.parse(localStorage.getItem('pageViews') || '[]')
  const contentViews = JSON.parse(localStorage.getItem('contentViews') || '[]')
  const events = JSON.parse(localStorage.getItem('analyticsEvents') || '[]')
  
  const now = new Date()
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  // Filter by date
  const weeklyViews = pageViews.filter((view: PageView) => 
    new Date(view.timestamp) > lastWeek
  )
  const dailyViews = pageViews.filter((view: PageView) => 
    new Date(view.timestamp) > lastDay
  )
  const monthlyViews = pageViews.filter((view: PageView) => 
    new Date(view.timestamp) > lastMonth
  )
  
  // Count page visits for popular pages
  const pageCounts: { [key: string]: number } = {}
  monthlyViews.forEach((view: PageView) => {
    const path = view.path
    pageCounts[path] = (pageCounts[path] || 0) + 1
  })
  
  const popularPages = Object.entries(pageCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([path, count]) => ({
      name: getPageDisplayName(path),
      visits: count,
      path
    }))
  
  // Count content by type
  const contentStats = {
    articles: contentViews.filter((view: ContentView) => view.type === 'article').length,
    events: contentViews.filter((view: ContentView) => view.type === 'event').length,
    bestOf: contentViews.filter((view: ContentView) => view.type === 'bestOf').length,
    edmonton: contentViews.filter((view: ContentView) => view.type === 'location' && view.id === 'edmonton').length,
    calgary: contentViews.filter((view: ContentView) => view.type === 'location' && view.id === 'calgary').length,
  }
  
  // Get unique sessions
  const uniqueSessions = new Set(pageViews.map((view: PageView) => view.sessionId)).size
  
  return {
    totalVisits: pageViews.length,
    weeklyVisits: weeklyViews.length,
    dailyVisits: dailyViews.length,
    uniqueSessions,
    popularPages,
    contentStats,
    recentActivity: pageViews.slice(-10).reverse().map((view: PageView) => ({
      path: view.path,
      title: view.title,
      timestamp: view.timestamp,
      timeAgo: getTimeAgo(new Date(view.timestamp))
    }))
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

// Helper function to get time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

// Track article views
export const trackArticleView = (articleId: string, title: string) => {
  trackEvent({
    action: 'view_article',
    category: 'content',
    label: title,
  })
  trackPageView(`/articles/${articleId}`, title)
  trackContentView('article', articleId, title)
}

// Track location views
export const trackLocationView = (location: string) => {
  trackEvent({
    action: `view_${location.toLowerCase()}`,
    category: 'location',
    label: location,
  })
  trackContentView('location', location.toLowerCase(), `${location} Page`, location)
}

// Track admin actions
export const trackAdminAction = (action: string, details?: string) => {
  trackEvent({
    action,
    category: 'admin',
    label: details,
  })
}

// Track newsletter subscriptions
export const trackNewsletterSignup = (location: string, email: string) => {
  trackEvent({
    action: 'newsletter_signup',
    category: 'engagement',
    label: location,
    value: 1,
  })
}

// Initialize analytics on page load
export const initializeAnalytics = () => {
  if (typeof window !== 'undefined') {
    // Track the initial page view
    trackPageView(window.location.pathname, document.title)
    
    // Set up automatic page view tracking for navigation
    const originalPushState = history.pushState
    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      setTimeout(() => {
        trackPageView(window.location.pathname, document.title)
      }, 100)
    }
  }
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}
