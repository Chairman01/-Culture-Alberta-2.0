-- Check what's in the events table
-- Run this in Supabase SQL Editor

-- Check if events table exists and has data
SELECT 
  COUNT(*) as events_count,
  'Total events in events table' as description
FROM events;

-- Show all events in the events table
SELECT 
  id,
  title,
  location,
  event_date,
  status
FROM events 
ORDER BY event_date DESC
LIMIT 10;

-- Check what's still in articles table with event type
SELECT 
  COUNT(*) as articles_with_event_type,
  'Articles still marked as events in articles table' as description
FROM articles 
WHERE type = 'event' OR type = 'Event';

-- Show articles that are still marked as events
SELECT 
  id,
  title,
  type,
  location,
  created_at
FROM articles 
WHERE type = 'event' OR type = 'Event'
ORDER BY created_at DESC
LIMIT 5;
