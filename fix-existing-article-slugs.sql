-- Fix existing articles that don't have proper slugs
-- Run this in Supabase SQL Editor

-- First, let's see what articles need fixing
SELECT 
  id,
  title,
  slug,
  created_at
FROM articles 
WHERE slug IS NULL OR slug = '' OR slug LIKE 'article-%'
ORDER BY created_at DESC;

-- Update articles that still have ID-based or missing slugs
UPDATE articles 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '' OR slug LIKE 'article-%';

-- Handle any duplicate slugs by appending numbers
WITH numbered_slugs AS (
  SELECT 
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM articles 
  WHERE slug IS NOT NULL
),
duplicate_slugs AS (
  SELECT id, slug, rn
  FROM numbered_slugs
  WHERE rn > 1
)
UPDATE articles 
SET slug = articles.slug || '-' || (duplicate_slugs.rn - 1)
FROM duplicate_slugs
WHERE articles.id = duplicate_slugs.id;

-- Verify the results
SELECT 
  id,
  title,
  slug,
  CASE 
    WHEN slug IS NULL THEN '❌ No slug'
    WHEN slug = '' THEN '❌ Empty slug'
    WHEN slug LIKE 'article-%' THEN '❌ Still ID-based'
    ELSE '✅ Proper slug'
  END as slug_status
FROM articles 
ORDER BY created_at DESC
LIMIT 10;
