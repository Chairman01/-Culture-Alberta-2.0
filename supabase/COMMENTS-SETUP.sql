-- =============================================================================
-- CULTURE ALBERTA - COMMENTS TABLE SETUP (Consolidated)
-- =============================================================================
-- Run this ONCE in Supabase SQL Editor to set up the comments feature.
-- You do NOT need the many other SQL files in .claude/ - this replaces them.
-- =============================================================================

-- 1. Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies (in case you ran other SQLs before)
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
DROP POLICY IF EXISTS "Service role can do everything" ON comments;
DROP POLICY IF EXISTS "allow_read_approved_comments" ON comments;
DROP POLICY IF EXISTS "allow_insert_comments" ON comments;
DROP POLICY IF EXISTS "public_can_insert_pending_comments" ON comments;
DROP POLICY IF EXISTS "public_can_view_approved_comments" ON comments;

-- 5. Policy: Anyone can READ approved comments (anon + authenticated)
CREATE POLICY "allow_read_approved_comments"
  ON comments FOR SELECT
  USING (status = 'approved');

-- 6. Policy: Allow inserts (anon key used by API - auth is verified in the API before insert)
CREATE POLICY "allow_insert_comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- 7. Permissions (service_role bypasses RLS by default)
GRANT SELECT, INSERT ON comments TO anon;
GRANT SELECT, INSERT ON comments TO authenticated;

-- 8. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comments_timestamp ON comments;
CREATE TRIGGER update_comments_timestamp
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Done! Comments will work with auth-required posting via the Culture Alberta API.
