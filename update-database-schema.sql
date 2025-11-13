-- Add missing columns to analytics tables for Culture Alberta
-- This will fix the "screen_resolution column not found" error

-- Add missing columns to analytics_sessions table
ALTER TABLE analytics_sessions 
ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Add missing columns to analytics_events table (if needed)
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Add tags column to articles table for neighborhood filtering
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Also add categories column if it doesn't exist (for multiple categories)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS categories TEXT[];

-- Add slug column for SEO-friendly URLs
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index on slug for better performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- Create unique constraint on slug to prevent duplicates
-- Note: This will fail if there are duplicate slugs, so we'll handle that separately
-- ALTER TABLE articles ADD CONSTRAINT unique_article_slug UNIQUE (slug);

-- Verify the analytics tables have all required columns
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('analytics_sessions', 'analytics_events', 'analytics_page_views', 'analytics_content_views')
ORDER BY table_name, ordinal_position;

-- Verify the articles table structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;

-- Test insert to verify analytics works
INSERT INTO analytics_sessions (id, page_count, duration, started_at, screen_resolution) 
VALUES ('test_session_' || EXTRACT(EPOCH FROM NOW()), 1, 0, NOW(), '1920x1080')
ON CONFLICT (id) DO NOTHING;

-- Clean up test data
DELETE FROM analytics_sessions WHERE id LIKE 'test_session_%';

-- Test that the articles columns were added
SELECT 
  id,
  title,
  slug,
  tags,
  categories
FROM articles 
LIMIT 5;

-- Generate slugs for existing articles that don't have them
-- This creates URL-friendly slugs from article titles
UPDATE articles 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Handle duplicate slugs by appending numbers
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

-- Verify slugs were generated
SELECT 
  id,
  title,
  slug,
  CASE 
    WHEN slug IS NULL THEN '❌ No slug'
    WHEN slug = '' THEN '❌ Empty slug'
    ELSE '✅ Has slug'
  END as slug_status
FROM articles 
ORDER BY created_at DESC
LIMIT 10;
