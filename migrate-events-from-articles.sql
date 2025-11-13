-- Migration script to move events from articles table to dedicated events table
-- This separates events from articles for better data organization

-- First, create the events table (run create-events-table.sql first)
-- This script assumes the events table already exists

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

-- Optional: Remove events from articles table after migration
-- Uncomment the lines below if you want to remove events from articles table
-- WARNING: This will permanently delete event data from articles table
-- Make sure the migration was successful before running this

-- DELETE FROM articles WHERE type = 'event' OR type = 'Event';

-- Show remaining articles count
SELECT 
  COUNT(*) as remaining_articles,
  'Articles remaining in articles table' as message
FROM articles 
WHERE type != 'event' AND type != 'Event';
