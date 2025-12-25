-- Fix Comments Table RLS Policies
-- This script allows anonymous users to submit comments while maintaining security

-- Enable RLS on comments table if not already enabled
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view approved comments" ON comments;
DROP POLICY IF EXISTS "Anyone can insert pending comments" ON comments;
DROP POLICY IF EXISTS "Service role can manage all comments" ON comments;

-- Policy 1: Allow anyone to view approved comments
CREATE POLICY "Anyone can view approved comments"
ON comments
FOR SELECT
TO public
USING (status = 'approved');

-- Policy 2: Allow anyone to insert comments (they will be pending by default)
CREATE POLICY "Anyone can insert pending comments"
ON comments
FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND content IS NOT NULL
  AND author_name IS NOT NULL
  AND LENGTH(TRIM(author_name)) >= 2
  AND LENGTH(TRIM(content)) >= 3
);

-- Policy 3: Allow service role (backend API with service key) to manage all comments
-- This is for admin operations and moderation
CREATE POLICY "Service role can manage all comments"
ON comments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON comments TO anon;
GRANT INSERT ON comments TO anon;
GRANT ALL ON comments TO service_role;

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'comments'
ORDER BY policyname;
