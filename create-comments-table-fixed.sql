-- Create comments table for article comments
-- Run this in Supabase SQL Editor
-- FIXED: Changed article_id from UUID to TEXT to match article ID format

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,  -- Changed from UUID to TEXT
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert comments (they start as 'pending')
CREATE POLICY "Anyone can insert comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only approved comments are visible to public
CREATE POLICY "Public can view approved comments" ON comments
  FOR SELECT
  USING (status = 'approved');

-- Policy: Allow all operations for service role (for admin API)
-- Note: This will be used by the API with service role key
CREATE POLICY "Service role can do everything" ON comments
  FOR ALL
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_comments_timestamp
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT ON comments TO anon;
GRANT ALL ON comments TO authenticated;
