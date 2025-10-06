-- Fix: Remove incorrect event types from articles
-- This will make articles show correctly based on their categories only

-- Update all articles that are incorrectly marked as events to be regular articles
UPDATE articles 
SET type = 'article' 
WHERE type = 'event' OR type = 'Event';

-- Show how many were updated
SELECT 
  COUNT(*) as articles_updated,
  'Articles changed from event to article type' as message
FROM articles 
WHERE type = 'article';

-- Verify no more events in articles table
SELECT 
  COUNT(*) as remaining_events_in_articles,
  'Should be 0 - no events should remain in articles table' as message
FROM articles 
WHERE type = 'event' OR type = 'Event';

-- Show articles that should be events (have Events in categories)
SELECT 
  id,
  title,
  categories,
  'These articles have Events in categories and should show as events' as note
FROM articles 
WHERE categories @> '["Events"]'::jsonb
ORDER BY created_at DESC
LIMIT 5;