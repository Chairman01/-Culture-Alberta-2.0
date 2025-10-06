-- Create a separate events table for proper event management
-- This separates events from articles since they are different content types

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  excerpt TEXT,
  category TEXT,
  subcategory TEXT, -- e.g., 'Music', 'Food', 'Art', 'Sports'
  location TEXT NOT NULL, -- City (Edmonton, Calgary, etc.)
  venue TEXT, -- Specific venue name
  venue_address TEXT, -- Full venue address
  organizer TEXT, -- Event organizer name
  organizer_contact TEXT, -- Email or phone
  event_date TIMESTAMP WITH TIME ZONE NOT NULL, -- When the event happens
  event_end_date TIMESTAMP WITH TIME ZONE, -- When the event ends (for multi-day events)
  registration_date TIMESTAMP WITH TIME ZONE, -- When registration opens
  registration_end_date TIMESTAMP WITH TIME ZONE, -- When registration closes
  price DECIMAL(10,2), -- Event price
  currency TEXT DEFAULT 'CAD',
  capacity INTEGER, -- Maximum number of attendees
  current_attendees INTEGER DEFAULT 0,
  image_url TEXT,
  multiple_images JSONB DEFAULT '[]'::jsonb,
  website_url TEXT, -- Event website or registration link
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'postponed', 'sold_out')),
  featured BOOLEAN DEFAULT FALSE,
  featured_home BOOLEAN DEFAULT FALSE,
  featured_edmonton BOOLEAN DEFAULT FALSE,
  featured_calgary BOOLEAN DEFAULT FALSE,
  age_restriction TEXT, -- e.g., '18+', 'All Ages', '21+'
  accessibility_info TEXT, -- Accessibility information
  parking_info TEXT, -- Parking information
  what_to_bring TEXT, -- What attendees should bring
  dress_code TEXT, -- Dress code if any
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_featured_home ON events(featured_home);
CREATE INDEX IF NOT EXISTS idx_events_featured_edmonton ON events(featured_edmonton);
CREATE INDEX IF NOT EXISTS idx_events_featured_calgary ON events(featured_calgary);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now - you can make this more restrictive later)
CREATE POLICY "Allow all operations on events" ON events
  FOR ALL USING (true);

-- Add comment to document the table
COMMENT ON TABLE events IS 'Separate table for events - different from articles. Events have specific fields like event_date, venue, organizer, etc.';
COMMENT ON COLUMN events.event_date IS 'When the event actually happens (not when it was published)';
COMMENT ON COLUMN events.venue IS 'Specific venue name where the event takes place';
COMMENT ON COLUMN events.organizer IS 'Person or organization organizing the event';
