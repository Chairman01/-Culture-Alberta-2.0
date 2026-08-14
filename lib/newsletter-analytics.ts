/**
 * Pure newsletter analytics -- no database access, safe to import from client
 * components. Split out of lib/newsletter.ts so the admin page can use these
 * without pulling the service-role Supabase client into the browser bundle.
 */

export interface EmailEvent {
  id?: string
  email: string
  event_type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'delivery_delayed' | 'failed'
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
  delayed: number
  failed: number
  open_rate: number
  click_rate: number
  sent_at: string
}

export interface SubscriberEngagement {
  email: string
  total_delivered: number
  total_opens: number
  total_clicks: number
  last_delivered?: string
  last_opened?: string
  last_clicked?: string
  last_activity?: string
  last_campaign?: string
  last_status?: EmailEvent['event_type']
  bounced: boolean
  complained: boolean
  delayed: boolean
  failed: boolean
}

export interface CampaignRecipient {
  email: string
  delivered: boolean
  opened: boolean
  clicked: boolean
  bounced: boolean
  complained: boolean
  delayed: boolean
  failed: boolean
  opened_at?: string
  clicked_at?: string
  last_event_at?: string
  clicked_urls: string[]
}

export interface CampaignDetails {
  recipients: CampaignRecipient[]
  opened: CampaignRecipient[]
  clicked: CampaignRecipient[]
  bounced: CampaignRecipient[]
  complained: CampaignRecipient[]
  delayed: CampaignRecipient[]
  failed: CampaignRecipient[]
  clickUrls: { url: string; count: number; emails: string[] }[]
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


export function computeCampaignStats(events: EmailEvent[]): CampaignStat[] {
  const campaigns: Record<string, {
    delivered: Set<string>
    opened: Set<string>
    clicked: Set<string>
    bounced: Set<string>
    complained: Set<string>
    delayed: Set<string>
    failed: Set<string>
    first_at: string
  }> = {}

  for (const ev of events) {
    if (!ev.subject) continue
    if (!campaigns[ev.subject]) {
      campaigns[ev.subject] = {
        delivered: new Set(), opened: new Set(), clicked: new Set(),
        bounced: new Set(), complained: new Set(), delayed: new Set(), failed: new Set(),
        first_at: ev.created_at || '',
      }
    }
    const c = campaigns[ev.subject]
    if (ev.event_type === 'delivered') c.delivered.add(ev.email)
    if (ev.event_type === 'opened')    c.opened.add(ev.email)
    if (ev.event_type === 'clicked')   c.clicked.add(ev.email)
    if (ev.event_type === 'bounced')   c.bounced.add(ev.email)
    if (ev.event_type === 'complained') c.complained.add(ev.email)
    if (ev.event_type === 'delivery_delayed') c.delayed.add(ev.email)
    if (ev.event_type === 'failed') c.failed.add(ev.email)
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
        delayed: c.delayed.size, failed: c.failed.size,
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
      engagement[ev.email] = {
        email: ev.email,
        total_delivered: 0,
        total_opens: 0,
        total_clicks: 0,
        bounced: false,
        complained: false,
        delayed: false,
        failed: false,
      }
    }
    const e = engagement[ev.email]
    if (ev.created_at && (!e.last_activity || ev.created_at > e.last_activity)) {
      e.last_activity = ev.created_at
      e.last_campaign = ev.subject
      e.last_status = ev.event_type
    }
    if (ev.event_type === 'delivered') {
      e.total_delivered++
      if (!e.last_delivered || (ev.created_at && ev.created_at > e.last_delivered)) e.last_delivered = ev.created_at
    }
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
    if (ev.event_type === 'delivery_delayed') e.delayed = true
    if (ev.event_type === 'failed') e.failed = true
  }
  return engagement
}

export function getCampaignDetails(events: EmailEvent[], subject: string): CampaignDetails {
  const recipientMap: Record<string, CampaignRecipient> = {}
  const urlMap: Record<string, { url: string; count: number; emails: Set<string> }> = {}

  for (const ev of events) {
    if (ev.subject !== subject) continue
    if (!recipientMap[ev.email]) {
      recipientMap[ev.email] = {
        email: ev.email,
        delivered: false,
        opened: false,
        clicked: false,
        bounced: false,
        complained: false,
        delayed: false,
        failed: false,
        clicked_urls: [],
      }
    }

    const recipient = recipientMap[ev.email]
    if (ev.created_at && (!recipient.last_event_at || ev.created_at > recipient.last_event_at)) {
      recipient.last_event_at = ev.created_at
    }

    if (ev.event_type === 'delivered') recipient.delivered = true
    if (ev.event_type === 'opened') {
      recipient.opened = true
      if (!recipient.opened_at || (ev.created_at && ev.created_at > recipient.opened_at)) recipient.opened_at = ev.created_at
    }
    if (ev.event_type === 'clicked') {
      recipient.clicked = true
      if (!recipient.clicked_at || (ev.created_at && ev.created_at > recipient.clicked_at)) recipient.clicked_at = ev.created_at
      if (ev.clicked_url && !recipient.clicked_urls.includes(ev.clicked_url)) {
        recipient.clicked_urls.push(ev.clicked_url)
      }
      if (ev.clicked_url) {
        if (!urlMap[ev.clicked_url]) {
          urlMap[ev.clicked_url] = { url: ev.clicked_url, count: 0, emails: new Set() }
        }
        urlMap[ev.clicked_url].count++
        urlMap[ev.clicked_url].emails.add(ev.email)
      }
    }
    if (ev.event_type === 'bounced') recipient.bounced = true
    if (ev.event_type === 'complained') recipient.complained = true
    if (ev.event_type === 'delivery_delayed') recipient.delayed = true
    if (ev.event_type === 'failed') recipient.failed = true
  }

  const recipients = Object.values(recipientMap).sort((a, b) =>
    (b.last_event_at || '').localeCompare(a.last_event_at || '')
  )

  return {
    recipients,
    opened: recipients.filter(r => r.opened),
    clicked: recipients.filter(r => r.clicked),
    bounced: recipients.filter(r => r.bounced),
    complained: recipients.filter(r => r.complained),
    delayed: recipients.filter(r => r.delayed),
    failed: recipients.filter(r => r.failed),
    clickUrls: Object.values(urlMap)
      .map(item => ({ url: item.url, count: item.count, emails: Array.from(item.emails).sort() }))
      .sort((a, b) => b.count - a.count),
  }
}
