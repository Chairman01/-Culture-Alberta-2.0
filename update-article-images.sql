-- Update article images to use SVG files
UPDATE articles 
SET image = '/images/edmonton-culture.svg'
WHERE category ILIKE '%edmonton%' AND (image = '/images/edmonton-culture.jpg' OR image IS NULL);

UPDATE articles 
SET image = '/images/calgary-culture.svg'
WHERE category ILIKE '%calgary%' AND (image = '/images/calgary-culture.jpg' OR image IS NULL);

-- Show the updated articles
SELECT id, title, category, image FROM articles ORDER BY created_at DESC;
