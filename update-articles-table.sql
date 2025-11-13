-- Update articles table to use text IDs instead of UUIDs
-- Drop the existing table and recreate it with text IDs

DROP TABLE IF EXISTS articles;

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  location TEXT,
  author TEXT,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT DEFAULT 'article',
  status TEXT DEFAULT 'published',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_location ON articles(location);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

-- Enable Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now - you can make this more restrictive later)
CREATE POLICY "Allow all operations on articles" ON articles
  FOR ALL USING (true);
