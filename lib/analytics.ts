// Analytics utility for tracking user interactions
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
}

// Track page views
export const trackPageView = (path: string, title: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-V7DK0G3JFV', {
      page_path: path,
      page_title: title,
    })
  }
  
  // Also store in localStorage for local analytics
  const pageViews = JSON.parse(localStorage.getItem('pageViews') || '[]')
  pageViews.push({
    path,
    title,
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem('pageViews', JSON.stringify(pageViews.slice(-100))) // Keep last 100
}

// Track custom events
export const trackEvent = (event: AnalyticsEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    })
  }
  
  // Store events locally
  const events = JSON.parse(localStorage.getItem('analyticsEvents') || '[]')
  events.push({
    ...event,
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem('analyticsEvents', JSON.stringify(events.slice(-100)))
}

// Get analytics data for dashboard
export const getAnalyticsData = () => {
  if (typeof window === 'undefined') return null
  
  const pageViews = JSON.parse(localStorage.getItem('pageViews') || '[]')
  const events = JSON.parse(localStorage.getItem('analyticsEvents') || '[]')
  
  const now = new Date()
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Filter by date
  const weeklyViews = pageViews.filter((view: PageView) => 
    new Date(view.timestamp) > lastWeek
  )
  const dailyViews = pageViews.filter((view: PageView) => 
    new Date(view.timestamp) > lastDay
  )
  
  // Count page visits
  const pageCounts: { [key: string]: number } = {}
  pageViews.forEach((view: PageView) => {
    pageCounts[view.path] = (pageCounts[view.path] || 0) + 1
  })
  
  const popularPages = Object.entries(pageCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([path, count]) => ({
      name: path === '/' ? 'Homepage' : path.charAt(1).toUpperCase() + path.slice(2),
      visits: count
    }))
  
  return {
    totalVisits: pageViews.length,
    weeklyVisits: weeklyViews.length,
    dailyVisits: dailyViews.length,
    popularPages,
    contentStats: {
      articles: events.filter((e: any) => e.category === 'content' && e.action === 'view_article').length,
      events: events.filter((e: any) => e.category === 'content' && e.action === 'view_event').length,
      bestOf: events.filter((e: any) => e.category === 'content' && e.action === 'view_best_of').length,
      edmonton: events.filter((e: any) => e.category === 'location' && e.action === 'view_edmonton').length,
      calgary: events.filter((e: any) => e.category === 'location' && e.action === 'view_calgary').length,
    }
  }
}

// Track article views
export const trackArticleView = (articleId: string, title: string) => {
  trackEvent({
    action: 'view_article',
    category: 'content',
    label: title,
  })
  trackPageView(`/articles/${articleId}`, title)
}

// Track location views
export const trackLocationView = (location: string) => {
  trackEvent({
    action: `view_${location.toLowerCase()}`,
    category: 'location',
    label: location,
  })
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

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}
