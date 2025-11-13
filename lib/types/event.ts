export interface Event {
  id: string
  title: string
  description?: string
  excerpt?: string
  category?: string
  subcategory?: string
  location: string
  venue?: string
  venue_address?: string
  organizer?: string
  organizer_contact?: string
  event_date: string // ISO date string
  event_end_date?: string
  registration_date?: string
  registration_end_date?: string
  price?: number
  currency?: string
  capacity?: number
  current_attendees?: number
  image_url?: string
  multiple_images?: any[]
  website_url?: string
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string
  tags?: string[]
  status: 'draft' | 'published' | 'cancelled' | 'postponed' | 'sold_out'
  featured?: boolean
  featured_home?: boolean
  featured_edmonton?: boolean
  featured_calgary?: boolean
  age_restriction?: string
  accessibility_info?: string
  parking_info?: string
  what_to_bring?: string
  dress_code?: string
  created_at?: string
  updated_at?: string
}

export interface EventFormData {
  title: string
  description: string
  excerpt?: string
  category: string
  subcategory?: string
  location: string
  venue?: string
  venue_address?: string
  organizer?: string
  organizer_contact?: string
  event_date: string
  event_end_date?: string
  registration_date?: string
  registration_end_date?: string
  price?: number
  currency?: string
  capacity?: number
  image_url?: string
  website_url?: string
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string
  tags?: string[]
  status: 'draft' | 'published' | 'cancelled' | 'postponed' | 'sold_out'
  featured?: boolean
  featured_home?: boolean
  featured_edmonton?: boolean
  featured_calgary?: boolean
  age_restriction?: string
  accessibility_info?: string
  parking_info?: string
  what_to_bring?: string
  dress_code?: string
}
