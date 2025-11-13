-- Database Performance Indexes for Culture Alberta
-- Run these commands in your Supabase SQL Editor to improve query performance

-- 1. Index for faster title searches (used by getArticleBySlug)
-- This will make title-based searches much faster
CREATE INDEX IF NOT EXISTS idx_articles_title_search 
ON articles USING gin(to_tsvector('english', title));

-- 2. Index for faster category filtering
-- This will speed up category-based queries
CREATE INDEX IF NOT EXISTS idx_articles_category 
ON articles(category);

-- 3. Index for faster date sorting (most important)
-- This will speed up ORDER BY created_at queries
CREATE INDEX IF NOT EXISTS idx_articles_created_at_desc 
ON articles(created_at DESC);

-- 4. Index for faster ID lookups (used by getArticleById)
-- This will speed up primary key lookups
CREATE INDEX IF NOT EXISTS idx_articles_id 
ON articles(id);

-- 5. Composite index for homepage queries
-- This will speed up homepage article fetching with trending/featured flags
CREATE INDEX IF NOT EXISTS idx_articles_homepage 
ON articles(created_at DESC, trending_home, featured_home);

-- 6. Index for city-based filtering
-- This will speed up Edmonton/Calgary page queries
CREATE INDEX IF NOT EXISTS idx_articles_location 
ON articles(location);

-- 7. Index for type filtering (events, articles, etc.)
-- This will speed up events page queries
CREATE INDEX IF NOT EXISTS idx_articles_type 
ON articles(type);

-- 8. Composite index for admin queries
-- This will speed up admin article listing
CREATE INDEX IF NOT EXISTS idx_articles_admin 
ON articles(created_at DESC, status, type);

-- 9. Index for featured articles across cities
-- This will speed up featured article queries
CREATE INDEX IF NOT EXISTS idx_articles_featured_cities 
ON articles(featured_home, featured_edmonton, featured_calgary);

-- 10. Index for trending articles across cities
-- This will speed up trending article queries
CREATE INDEX IF NOT EXISTS idx_articles_trending_cities 
ON articles(trending_home, trending_edmonton, trending_calgary);

-- Optional: Full-text search index for better search functionality
-- This will enable fast full-text search across title and content
CREATE INDEX IF NOT EXISTS idx_articles_fulltext_search 
ON articles USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Check index usage and performance
-- Run this query to see which indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'articles'
ORDER BY idx_tup_read DESC;

-- Check table size and index size
SELECT 
    pg_size_pretty(pg_total_relation_size('articles')) as total_size,
    pg_size_pretty(pg_relation_size('articles')) as table_size,
    pg_size_pretty(pg_total_relation_size('articles') - pg_relation_size('articles')) as index_size;
