-- Add trending columns to existing articles table
-- Run this in your Supabase SQL editor

-- Add the trending columns if they don't exist
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS trending_home BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trending_edmonton BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trending_calgary BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_trending_home ON articles(trending_home);
CREATE INDEX IF NOT EXISTS idx_articles_trending_edmonton ON articles(trending_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_trending_calgary ON articles(trending_calgary);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'articles' 
AND column_name IN ('trending_home', 'trending_edmonton', 'trending_calgary');
