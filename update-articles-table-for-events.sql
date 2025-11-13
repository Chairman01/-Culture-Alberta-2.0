-- Migration script to update articles table for proper event handling
-- This script adds missing fields and updates existing ones

-- Add missing fields if they don't exist
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS read_time TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS rating INTEGER,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_home BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_edmonton BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_calgary BOOLEAN DEFAULT FALSE;

-- Update the type field to have better defaults and constraints
ALTER TABLE articles 
ALTER COLUMN type SET DEFAULT 'article';

-- Add a check constraint to ensure type is one of the valid values
ALTER TABLE articles 
DROP CONSTRAINT IF EXISTS articles_type_check;

ALTER TABLE articles 
ADD CONSTRAINT articles_type_check 
CHECK (type IN ('article', 'event', 'Event', 'news', 'guide'));

-- Create index on type field for better performance
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);

-- Create index on date field for event sorting
CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);

-- Update existing articles to have proper type if they're missing
UPDATE articles 
SET type = 'article' 
WHERE type IS NULL OR type = '';

-- Add a comment to document the type field usage
COMMENT ON COLUMN articles.type IS 'Type of content: article, event, news, guide. Events will appear in upcoming events sections.';

-- Verify the table structure
-- You can run this to see the current structure:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'articles' 
-- ORDER BY ordinal_position;
