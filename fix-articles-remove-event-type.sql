-- Quick fix: Remove event type from articles table
-- This will make those articles show as regular articles instead of events

-- Update all articles that are marked as events to be regular articles
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
