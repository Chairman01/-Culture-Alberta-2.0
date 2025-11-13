-- Clear the events table completely
-- Run this in Supabase SQL Editor

-- First, let's see what's in the events table
SELECT 
  COUNT(*) as total_events,
  'Events currently in events table' as message
FROM events;

-- Show what events are there
SELECT 
  id,
  title,
  location,
  event_date,
  status
FROM events 
ORDER BY event_date DESC;

-- Now delete all events
DELETE FROM events;

-- Verify it's empty
SELECT 
  COUNT(*) as remaining_events,
  'Should be 0 - all events deleted' as message
FROM events;
