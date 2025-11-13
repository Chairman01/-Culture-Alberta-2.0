-- Add categories column to articles table
-- This allows articles to belong to multiple categories

-- Add the categories column as a TEXT array
ALTER TABLE articles ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Create an index for the categories column for better performance
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN (categories);

-- Update existing articles to have their single category in the categories array
UPDATE articles 
SET categories = ARRAY[category] 
WHERE categories IS NULL OR array_length(categories, 1) IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN articles.categories IS 'Array of category names that this article belongs to';
