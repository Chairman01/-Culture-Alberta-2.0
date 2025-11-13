-- Clear all events and start fresh
-- Run this in Supabase SQL Editor

-- Delete all events from the events table
DELETE FROM events;

-- Remove all event types from articles table (convert them back to articles)
UPDATE articles 
SET type = 'article' 
WHERE type = 'event' OR type = 'Event';

-- Verify the cleanup
SELECT 
  COUNT(*) as events_in_events_table,
  'Should be 0 - all events cleared' as message
FROM events;

SELECT 
  COUNT(*) as articles_with_event_type,
  'Should be 0 - all articles converted back to article type' as message
FROM articles 
WHERE type = 'event' OR type = 'Event';

SELECT 
  COUNT(*) as total_articles,
  'Total articles remaining' as message
FROM articles;
