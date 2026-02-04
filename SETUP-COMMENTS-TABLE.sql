-- INSTRUCTIONS TO CREATE COMMENTS TABLE
-- ========================================
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste the SQL below
-- 6. Click "Run" or press Ctrl+Enter
-- 7. You should see "Success. No rows returned" message
-- ========================================

-- Create comments table for article comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,  -- TEXT to match article IDs like "article-1738638862680-abc123"
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
DROP POLICY IF EXISTS "Service role can do everything" ON comments;

-- Policy: Anyone can insert comments (they start as 'pending')
CREATE POLICY "Anyone can insert comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only approved comments are visible to public
CREATE POLICY "Public can view approved comments" ON comments
  FOR SELECT
  USING (status = 'approved');

-- Policy: Allow service role to manage all comments (for admin)
CREATE POLICY "Service role can do everything" ON comments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS update_comments_timestamp ON comments;
CREATE TRIGGER update_comments_timestamp
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT ON comments TO anon;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comments TO service_role;

-- Verify the table was created
SELECT 'Comments table created successfully!' as message;
SELECT COUNT(*) as comment_count FROM comments;
