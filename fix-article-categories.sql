-- First, let's see what articles are in the database
SELECT id, title, category, location, image, created_at 
FROM articles 
ORDER BY created_at DESC;

-- Update any articles with incorrect categories
-- If an article has "eee" in title and Calgary category, make sure location doesn't contain "edmonton"
UPDATE articles 
SET location = 'Calgary, Alberta'
WHERE title ILIKE '%eee%' AND category = 'Calgary' AND (location ILIKE '%edmonton%' OR location = 'eeee');

-- Update any articles with "eee" in title and Edmonton category, make sure location doesn't contain "calgary"
UPDATE articles 
SET location = 'Edmonton, Alberta'
WHERE title ILIKE '%eee%' AND category = 'Edmonton' AND (location ILIKE '%calgary%' OR location = 'eeee');

-- Show the results after updates
SELECT id, title, category, location, image, created_at 
FROM articles 
ORDER BY created_at DESC;
