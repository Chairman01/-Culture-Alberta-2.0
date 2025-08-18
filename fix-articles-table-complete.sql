-- Comprehensive fix for articles table
-- This script ensures all required columns exist for the application to work properly

-- First, let's make sure we have the basic table structure
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  categories TEXT[] DEFAULT '{}',
  location TEXT,
  author TEXT,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT DEFAULT 'article',
  status TEXT DEFAULT 'published',
  image TEXT,
  image_url TEXT,
  multiple_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Trending flags
  trending_home BOOLEAN DEFAULT FALSE,
  trending_edmonton BOOLEAN DEFAULT FALSE,
  trending_calgary BOOLEAN DEFAULT FALSE,
  -- Featured flags
  featured_home BOOLEAN DEFAULT FALSE,
  featured_edmonton BOOLEAN DEFAULT FALSE,
  featured_calgary BOOLEAN DEFAULT FALSE
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add categories column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'categories') THEN
        ALTER TABLE articles ADD COLUMN categories TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'image_url') THEN
        ALTER TABLE articles ADD COLUMN image_url TEXT;
    END IF;
    
    -- Add multiple_images column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'multiple_images') THEN
        ALTER TABLE articles ADD COLUMN multiple_images JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add trending columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'trending_home') THEN
        ALTER TABLE articles ADD COLUMN trending_home BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'trending_edmonton') THEN
        ALTER TABLE articles ADD COLUMN trending_edmonton BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'trending_calgary') THEN
        ALTER TABLE articles ADD COLUMN trending_calgary BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add featured columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'featured_home') THEN
        ALTER TABLE articles ADD COLUMN featured_home BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'featured_edmonton') THEN
        ALTER TABLE articles ADD COLUMN featured_edmonton BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'featured_calgary') THEN
        ALTER TABLE articles ADD COLUMN featured_calgary BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_articles_location ON articles(location);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_trending_home ON articles(trending_home);
CREATE INDEX IF NOT EXISTS idx_articles_trending_edmonton ON articles(trending_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_trending_calgary ON articles(trending_calgary);
CREATE INDEX IF NOT EXISTS idx_articles_featured_home ON articles(featured_home);
CREATE INDEX IF NOT EXISTS idx_articles_featured_edmonton ON articles(featured_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_featured_calgary ON articles(featured_calgary);
CREATE INDEX IF NOT EXISTS idx_articles_multiple_images ON articles USING GIN (multiple_images);

-- Enable Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on articles" ON articles;

-- Create policy to allow all operations (for now - you can make this more restrictive later)
CREATE POLICY "Allow all operations on articles" ON articles
  FOR ALL USING (true);

-- Update existing articles to have empty categories array if they don't have it
UPDATE articles 
SET categories = ARRAY[category] 
WHERE categories IS NULL OR array_length(categories, 1) IS NULL;

-- Update existing articles to have empty multiple_images array if they don't have it
UPDATE articles 
SET multiple_images = '[]'::jsonb 
WHERE multiple_images IS NULL;

-- Show the final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;
