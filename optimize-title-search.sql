-- Additional Optimization for Title-Based Search
-- Run this AFTER the main script to optimize LIKE queries

-- 1. Create a specialized index for title word searches
-- This will help with partial title matches like 'calgary' in 'calgarys-mayoral-race'
CREATE INDEX IF NOT EXISTS idx_articles_title_words 
ON articles USING gin(string_to_array(LOWER(title), ' '));

-- 2. Create a trigram index for fuzzy title matching
-- This enables fast partial string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm 
ON articles USING gin(title gin_trgm_ops);

-- 3. Create a composite index for title + date sorting
-- This will help when filtering by title AND sorting by date
CREATE INDEX IF NOT EXISTS idx_articles_title_date 
ON articles(LOWER(title), created_at DESC);

-- 4. Test the optimized query performance
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE title ILIKE '%calgary%'  -- Use ILIKE instead of LOWER() LIKE
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Test with trigram search (even faster for partial matches)
EXPLAIN ANALYZE 
SELECT id, title, created_at 
FROM articles 
WHERE title % 'calgary'  -- Trigram similarity search
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'articles'
ORDER BY idx_tup_read DESC;
