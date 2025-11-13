-- Fix duplicate articles in the database
-- This script removes duplicate articles and keeps only the most recent one

-- First, let's see what duplicates we have
SELECT id, COUNT(*) as count, array_agg(title) as titles
FROM articles 
GROUP BY id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Remove duplicates, keeping only the most recent one
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
  FROM articles
)
DELETE FROM articles 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Verify no more duplicates
SELECT id, COUNT(*) as count
FROM articles 
GROUP BY id 
HAVING COUNT(*) > 1;

-- Add unique constraint to prevent future duplicates
ALTER TABLE articles ADD CONSTRAINT articles_id_unique UNIQUE (id);

-- Show final count
SELECT COUNT(*) as total_articles FROM articles;
