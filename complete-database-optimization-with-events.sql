-- Complete Database Cleanup and Performance Optimization for Culture Alberta
-- INCLUDES: Events table separation from articles
-- Run this entire script in your Supabase SQL Editor

-- ============================================
-- PART 1: DATABASE CLEANUP
-- ============================================

-- Remove slug column and related complexity
ALTER TABLE articles DROP COLUMN IF EXISTS slug;

-- Remove slug-related functions
DROP FUNCTION IF EXISTS generate_unique_slug(TEXT, TEXT);
DROP FUNCTION IF EXISTS auto_generate_slug();

-- Remove slug-related triggers
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON articles;

-- Remove slug-related indexes
DROP INDEX IF EXISTS idx_articles_slug;
DROP INDEX IF EXISTS idx_articles_slug_unique;

-- Add missing columns to analytics tables
ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Ensure articles table has all required columns
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE articles ADD COLUMN IF NOT EXISTS categories TEXT[];

-- ============================================
-- PART 2: CREATE SEPARATE EVENTS TABLE
-- ============================================

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

-- Create indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_featured_home ON events(featured_home);
CREATE INDEX IF NOT EXISTS idx_events_featured_edmonton ON events(featured_edmonton);
CREATE INDEX IF NOT EXISTS idx_events_featured_calgary ON events(featured_calgary);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer);

-- Enable Row Level Security (RLS) for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on events
CREATE POLICY "Allow all operations on events" ON events
  FOR ALL USING (true);

-- Add comments to document the events table
COMMENT ON TABLE events IS 'Separate table for events - different from articles. Events have specific fields like event_date, venue, organizer, etc.';
COMMENT ON COLUMN events.event_date IS 'When the event actually happens (not when it was published)';
COMMENT ON COLUMN events.venue IS 'Specific venue name where the event takes place';
COMMENT ON COLUMN events.organizer IS 'Person or organization organizing the event';

-- ============================================
-- PART 3: MIGRATE EXISTING EVENTS FROM ARTICLES
-- ============================================

-- Migrate existing events from articles table to events table
INSERT INTO events (
  id,
  title,
  description,
  excerpt,
  category,
  location,
  organizer,
  event_date,
  image_url,
  tags,
  status,
  featured,
  featured_home,
  featured_edmonton,
  featured_calgary,
  created_at,
  updated_at
)
SELECT 
  id,
  title,
  content as description,
  excerpt,
  category,
  location,
  author as organizer, -- Using author field as organizer for now
  COALESCE(date, created_at) as event_date, -- Use date field or created_at as event date
  COALESCE(image_url, image) as image_url,
  COALESCE(tags, ARRAY[]::TEXT[]) as tags,
  status,
  COALESCE(featured, FALSE) as featured,
  COALESCE(featured_home, FALSE) as featured_home,
  COALESCE(featured_edmonton, FALSE) as featured_edmonton,
  COALESCE(featured_calgary, FALSE) as featured_calgary,
  created_at,
  updated_at
FROM articles 
WHERE type = 'event' OR type = 'Event';

-- Show how many events were migrated
SELECT 
  COUNT(*) as events_migrated,
  'Events successfully migrated from articles table' as message
FROM events;

-- ============================================
-- PART 4: CORE PERFORMANCE INDEXES
-- ============================================

-- 1. Most Important: Date sorting index (speeds up homepage, admin, city pages)
CREATE INDEX IF NOT EXISTS idx_articles_created_at_desc 
ON articles(created_at DESC);

-- 2. Title search indexes (speeds up article loading by title-based URLs)
CREATE INDEX IF NOT EXISTS idx_articles_title 
ON articles(title);

CREATE INDEX IF NOT EXISTS idx_articles_title_lower 
ON articles(LOWER(title));

-- Enhanced title search for partial matches (for your getArticleBySlug function)
CREATE INDEX IF NOT EXISTS idx_articles_title_search 
ON articles USING gin(to_tsvector('english', title));

-- 3. Category filtering index (speeds up category-based queries)
CREATE INDEX IF NOT EXISTS idx_articles_category 
ON articles(category);

-- 4. Location filtering index (speeds up Edmonton/Calgary pages)
CREATE INDEX IF NOT EXISTS idx_articles_location 
ON articles(location);

-- 5. Type filtering index (speeds up events page) - UPDATED to exclude events
CREATE INDEX IF NOT EXISTS idx_articles_type 
ON articles(type) WHERE type != 'event' AND type != 'Event';

-- 6. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_articles_homepage 
ON articles(created_at DESC, trending_home, featured_home);

CREATE INDEX IF NOT EXISTS idx_articles_city_pages 
ON articles(location, created_at DESC);

-- Remove the old events index since events are now in separate table
DROP INDEX IF EXISTS idx_articles_events;

-- 7. Featured and trending indexes
CREATE INDEX IF NOT EXISTS idx_articles_featured_cities 
ON articles(featured_home, featured_edmonton, featured_calgary);

CREATE INDEX IF NOT EXISTS idx_articles_trending_cities 
ON articles(trending_home, trending_edmonton, trending_calgary);

-- ============================================
-- PART 5: ADDITIONAL TITLE SEARCH OPTIMIZATION
-- ============================================

-- 1. Create a specialized index for title word searches
-- This will help with partial title matches like 'calgary' in 'calgarys-mayoral-race'
CREATE INDEX IF NOT EXISTS idx_articles_title_words 
ON articles USING gin(string_to_array(LOWER(title), ' '));

-- 2. Create a trigram index for fuzzy title matching
-- This enables fast partial string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm 
ON articles USING gin(title gin_trgm_ops);

-- 3. Create a composite index for title + date sorting
-- This will help when filtering by title AND sorting by date
CREATE INDEX IF NOT EXISTS idx_articles_title_date 
ON articles(LOWER(title), created_at DESC);

-- ============================================
-- PART 6: VERIFICATION AND TESTING
-- ============================================

-- Test that articles still work
SELECT id, title, created_at FROM articles ORDER BY created_at DESC LIMIT 5;

-- Test that events were migrated successfully
SELECT id, title, event_date FROM events ORDER BY event_date ASC LIMIT 5;

-- Check if indexes were created successfully
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('articles', 'events')
ORDER BY tablename, indexname;

-- Check table sizes and index sizes
SELECT 
    'articles' as table_name,
    pg_size_pretty(pg_total_relation_size('articles')) as total_size,
    pg_size_pretty(pg_relation_size('articles')) as table_size,
    pg_size_pretty(pg_total_relation_size('articles') - pg_relation_size('articles')) as index_size
UNION ALL
SELECT 
    'events' as table_name,
    pg_size_pretty(pg_total_relation_size('events')) as total_size,
    pg_size_pretty(pg_relation_size('events')) as table_size,
    pg_size_pretty(pg_total_relation_size('events') - pg_relation_size('events')) as index_size;

-- Test original query performance (articles only)
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE LOWER(title) LIKE '%calgary%' 
ORDER BY created_at DESC 
LIMIT 10;

-- Test optimized query performance with ILIKE
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE title ILIKE '%calgary%'  -- Use ILIKE instead of LOWER() LIKE
ORDER BY created_at DESC 
LIMIT 10;

-- Test with trigram search (even faster for partial matches)
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE title % 'calgary'  -- Trigram similarity search
ORDER BY created_at DESC 
LIMIT 10;

-- Test events query performance
EXPLAIN ANALYZE 
SELECT id, title, event_date 
FROM events 
WHERE location ILIKE '%edmonton%'
ORDER BY event_date ASC 
LIMIT 10;

-- Show remaining articles count (should not include events)
SELECT 
  COUNT(*) as remaining_articles,
  'Articles remaining in articles table (events excluded)' as message
FROM articles 
WHERE type != 'event' AND type != 'Event';

-- Show events count
SELECT 
  COUNT(*) as total_events,
  'Events in dedicated events table' as message
FROM events;

-- Check index usage statistics
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE relname IN ('articles', 'events')
ORDER BY relname, idx_tup_read DESC;
