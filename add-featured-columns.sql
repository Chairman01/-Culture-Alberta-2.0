-- Add featured article columns to existing articles table
-- Run this in your Supabase SQL editor

-- Add the featured article columns if they don't exist
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS featured_home BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_edmonton BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_calgary BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_featured_home ON articles(featured_home);
CREATE INDEX IF NOT EXISTS idx_articles_featured_edmonton ON articles(featured_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_featured_calgary ON articles(featured_calgary);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'articles' 
AND column_name IN ('featured_home', 'featured_edmonton', 'featured_calgary');
