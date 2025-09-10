-- Remove slug column and related complexity
-- This simplifies the system to use title-based URLs
-- Run this in Supabase SQL Editor

-- Remove the slug column (this will also remove the index)
ALTER TABLE articles DROP COLUMN IF EXISTS slug;

-- Remove the slug-related functions
DROP FUNCTION IF EXISTS generate_unique_slug(TEXT, TEXT);
DROP FUNCTION IF EXISTS auto_generate_slug();

-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON articles;

-- Verify the articles table is clean
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;

-- Test that articles still work
SELECT 
  id,
  title,
  created_at
FROM articles 
ORDER BY created_at DESC
LIMIT 5;
