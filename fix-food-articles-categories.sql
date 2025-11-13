-- Fix food-related articles to have proper Food & Drink categorization
-- This will add "Food & Drink" to the categories array for food-related articles

-- Update articles that are clearly food-related based on their titles
UPDATE articles 
SET categories = array_append(
  COALESCE(categories, ARRAY[category]), 
  'Food & Drink'
)
WHERE 
  -- Food-related keywords in title
  LOWER(title) LIKE '%restaurant%' OR
  LOWER(title) LIKE '%cafe%' OR
  LOWER(title) LIKE '%coffee%' OR
  LOWER(title) LIKE '%sushi%' OR
  LOWER(title) LIKE '%brunch%' OR
  LOWER(title) LIKE '%eat%' OR
  LOWER(title) LIKE '%dining%' OR
  LOWER(title) LIKE '%food%' OR
  LOWER(title) LIKE '%drink%' OR
  LOWER(title) LIKE '%brewery%' OR
  LOWER(title) LIKE '%cuisine%' OR
  LOWER(title) LIKE '%meal%' OR
  LOWER(title) LIKE '%menu%' OR
  LOWER(title) LIKE '%bite%' OR
  LOWER(title) LIKE '%taste%' OR
  LOWER(title) LIKE '%culinary%'
  -- Only if not already categorized as Food & Drink
  AND NOT ('Food & Drink' = ANY(COALESCE(categories, ARRAY[category])));

-- Update articles that are clearly event-related based on their titles
UPDATE articles 
SET categories = array_append(
  COALESCE(categories, ARRAY[category]), 
  'Events'
)
WHERE 
  -- Event-related keywords in title
  LOWER(title) LIKE '%festival%' OR
  LOWER(title) LIKE '%concert%' OR
  LOWER(title) LIKE '%show%' OR
  LOWER(title) LIKE '%exhibition%' OR
  LOWER(title) LIKE '%event%' OR
  LOWER(title) LIKE '%music%' OR
  LOWER(title) LIKE '%theater%' OR
  LOWER(title) LIKE '%theatre%' OR
  LOWER(title) LIKE '%performance%' OR
  LOWER(title) LIKE '%gala%' OR
  LOWER(title) LIKE '%celebration%' OR
  LOWER(title) LIKE '%fair%' OR
  LOWER(title) LIKE '%carnival%' OR
  LOWER(title) LIKE '%expo%'
  -- Only if not already categorized as Events
  AND NOT ('Events' = ANY(COALESCE(categories, ARRAY[category])));

-- Show the results
SELECT 
  title,
  category,
  categories,
  CASE 
    WHEN 'Food & Drink' = ANY(categories) THEN 'YES'
    ELSE 'NO'
  END as has_food_category,
  CASE 
    WHEN 'Events' = ANY(categories) THEN 'YES'
    ELSE 'NO'
  END as has_event_category
FROM articles 
WHERE 
  'Food & Drink' = ANY(categories) OR 
  'Events' = ANY(categories)
ORDER BY title;
