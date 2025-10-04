-- Fix event types in Supabase database
-- This script will update articles that should be events to have type = 'event'

-- Update articles that are clearly festivals/events by title
UPDATE articles
SET type = 'event'
WHERE 
  (title ILIKE '%festival%' OR 
   title ILIKE '%concert%' OR 
   title ILIKE '%music fest%' OR
   title ILIKE '%folk festival%' OR
   title ILIKE '%afro music%' OR
   title ILIKE '%exhibition%' OR
   title ILIKE '%performance%' OR
   title ILIKE '%show%' OR
   title ILIKE '%gala%' OR
   title ILIKE '%celebration%' OR
   title ILIKE '%fair%' OR
   title ILIKE '%carnival%' OR
   title ILIKE '%expo%' OR
   title ILIKE '%conference%' OR
   title ILIKE '%workshop%' OR
   title ILIKE '%seminar%')
  AND type = 'article';

-- Check what we updated
SELECT id, title, type, category 
FROM articles 
WHERE type = 'event'
ORDER BY created_at DESC;
