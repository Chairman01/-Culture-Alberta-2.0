-- Fix food & drink categories in Supabase database
-- This script will add "Food & Drink" to the categories array for food-related articles

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
   title ILIKE '%culinary%')
  AND NOT ('Food & Drink' = ANY(categories));

-- Check what we updated
SELECT id, title, category, categories 
FROM articles 
WHERE 'Food & Drink' = ANY(categories)
ORDER BY created_at DESC;
