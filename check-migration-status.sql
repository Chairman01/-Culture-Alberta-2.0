-- Check if the migration worked properly
-- Run this in Supabase SQL Editor to see what happened

-- 1. Check if events table exists and has data
SELECT 
  'events' as table_name,
  COUNT(*) as count,
  'Events in events table' as description
FROM events
UNION ALL
SELECT 
  'articles_with_event_type' as table_name,
  COUNT(*) as count,
  'Articles still marked as events' as description
FROM articles 
WHERE type = 'event' OR type = 'Event';

-- 2. Show what's in the events table
SELECT 
  id,
  title,
  event_date,
  location
FROM events 
ORDER BY event_date DESC
LIMIT 5;

-- 3. Show what's still in articles with event type
SELECT 
  id,
  title,
  type,
  created_at,
  location
FROM articles 
WHERE type = 'event' OR type = 'Event'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Show total articles count
SELECT 
  COUNT(*) as total_articles,
  'Total articles in articles table' as description
FROM articles;
