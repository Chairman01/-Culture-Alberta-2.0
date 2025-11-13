-- Enhanced Database Cleanup and Performance Indexes for Culture Alberta
-- Run these commands in your Supabase SQL Editor

-- ============================================
-- PART 1: DATABASE CLEANUP (Your existing code)
-- ============================================

-- Remove slug column and related complexity
ALTER TABLE articles DROP COLUMN IF EXISTS slug;

-- Remove slug-related functions
DROP FUNCTION IF EXISTS generate_unique_slug(TEXT, TEXT);
DROP FUNCTION IF EXISTS auto_generate_slug();

-- Remove slug-related triggers
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON articles;

-- Remove slug-related indexes
DROP INDEX IF EXISTS idx_articles_slug;
DROP INDEX IF EXISTS idx_articles_slug_unique;

-- Add missing columns to analytics tables
ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Ensure articles table has all required columns
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE articles ADD COLUMN IF NOT EXISTS categories TEXT[];

-- ============================================
-- PART 2: PERFORMANCE INDEXES (Enhanced)
-- ============================================

-- 1. Most Important: Date sorting index (speeds up homepage, admin, city pages)
CREATE INDEX IF NOT EXISTS idx_articles_created_at_desc 
ON articles(created_at DESC);

-- 2. Title search indexes (speeds up article loading by title-based URLs)
CREATE INDEX IF NOT EXISTS idx_articles_title 
ON articles(title);

CREATE INDEX IF NOT EXISTS idx_articles_title_lower 
ON articles(LOWER(title));

-- Enhanced title search for partial matches (for your getArticleBySlug function)
CREATE INDEX IF NOT EXISTS idx_articles_title_search 
ON articles USING gin(to_tsvector('english', title));

-- 3. Category filtering index (speeds up category-based queries)
CREATE INDEX IF NOT EXISTS idx_articles_category 
ON articles(category);

-- 4. Location filtering index (speeds up Edmonton/Calgary pages)
CREATE INDEX IF NOT EXISTS idx_articles_location 
ON articles(location);

-- 5. Type filtering index (speeds up events page)
CREATE INDEX IF NOT EXISTS idx_articles_type 
ON articles(type);

-- 6. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_articles_homepage 
ON articles(created_at DESC, trending_home, featured_home);

CREATE INDEX IF NOT EXISTS idx_articles_city_pages 
ON articles(location, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_events 
ON articles(type, created_at DESC) WHERE type = 'event';

-- 7. Featured and trending indexes
CREATE INDEX IF NOT EXISTS idx_articles_featured_cities 
ON articles(featured_home, featured_edmonton, featured_calgary);

CREATE INDEX IF NOT EXISTS idx_articles_trending_cities 
ON articles(trending_home, trending_edmonton, trending_calgary);

-- ============================================
-- PART 3: VERIFICATION AND TESTING
-- ============================================

-- Test that articles still work
SELECT id, title, created_at FROM articles ORDER BY created_at DESC LIMIT 5;

-- Check if indexes were created successfully
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'articles' 
ORDER BY indexname;

-- Check table size and index size
SELECT 
    pg_size_pretty(pg_total_relation_size('articles')) as total_size,
    pg_size_pretty(pg_relation_size('articles')) as table_size,
    pg_size_pretty(pg_total_relation_size('articles') - pg_relation_size('articles')) as index_size;

-- Test title-based search performance
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE LOWER(title) LIKE '%calgary%' 
ORDER BY created_at DESC 
LIMIT 10;
