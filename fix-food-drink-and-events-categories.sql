-- Comprehensive script to fix Food & Drink and Events categories in Supabase database
-- This script will add proper categories to articles based on their content

-- ============================================================================
-- PART 1: FIX FOOD & DRINK CATEGORIES
-- ============================================================================

-- Update articles that are clearly food-related by title
UPDATE articles
SET 
  categories = CASE 
    WHEN categories IS NULL THEN ARRAY['Food & Drink']
    WHEN NOT ('Food & Drink' = ANY(categories)) THEN array_append(categories, 'Food & Drink')
    ELSE categories
  END
WHERE 
  (title ILIKE '%restaurant%' OR 
   title ILIKE '%cafe%' OR 
   title ILIKE '%coffee%' OR 
   title ILIKE '%sushi%' OR 
   title ILIKE '%brunch%' OR 
   title ILIKE '%eat%' OR 
   title ILIKE '%dining%' OR 
   title ILIKE '%food%' OR 
   title ILIKE '%drink%' OR 
   title ILIKE '%brewery%' OR 
   title ILIKE '%cuisine%' OR 
   title ILIKE '%meal%' OR 
   title ILIKE '%menu%' OR 
   title ILIKE '%bite%' OR 
   title ILIKE '%taste%' OR 
   title ILIKE '%culinary%' OR
   title ILIKE '%kitchen%' OR
   title ILIKE '%chef%' OR
   title ILIKE '%recipe%' OR
   title ILIKE '%cooking%' OR
   title ILIKE '%beverage%' OR
   title ILIKE '%wine%' OR
   title ILIKE '%beer%' OR
   title ILIKE '%cocktail%')
  AND NOT ('Food & Drink' = ANY(categories));

-- ============================================================================
-- PART 2: FIX EVENTS CATEGORIES AND TYPES
-- ============================================================================

-- Update articles that are clearly events by title and set type = 'event'
UPDATE articles
SET 
  categories = CASE 
    WHEN categories IS NULL THEN ARRAY['Events']
    WHEN NOT ('Events' = ANY(categories)) THEN array_append(categories, 'Events')
    ELSE categories
  END,
  type = 'event'
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
   title ILIKE '%seminar%' OR
   title ILIKE '%music festival%' OR
   title ILIKE '%theater%' OR
   title ILIKE '%theatre%')
  AND NOT ('Events' = ANY(categories));

-- ============================================================================
-- PART 3: CHECK RESULTS
-- ============================================================================

-- Show all Food & Drink articles
SELECT 
  'FOOD & DRINK ARTICLES' as section,
  id, 
  title, 
  category, 
  categories,
  type
FROM articles 
WHERE 'Food & Drink' = ANY(categories)
ORDER BY created_at DESC;

-- Show all Events articles
SELECT 
  'EVENTS ARTICLES' as section,
  id, 
  title, 
  category, 
  categories,
  type
FROM articles 
WHERE 'Events' = ANY(categories) OR type = 'event'
ORDER BY created_at DESC;

-- Show summary counts
SELECT 
  'SUMMARY' as section,
  COUNT(*) FILTER (WHERE 'Food & Drink' = ANY(categories)) as food_drink_count,
  COUNT(*) FILTER (WHERE 'Events' = ANY(categories) OR type = 'event') as events_count,
  COUNT(*) as total_articles
FROM articles;
