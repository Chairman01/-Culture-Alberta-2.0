-- WORKING RLS CONFIGURATION FOR COMMENTS
-- This configuration is proven to work based on successful testing

-- Step 1: Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "allow_public_insert" ON comments;
DROP POLICY IF EXISTS "public_can_view_approved_comments" ON comments;
DROP POLICY IF EXISTS "service_role_full_access" ON comments;

-- Step 3: Create working policies

-- Allow anonymous and authenticated users to insert comments
CREATE POLICY "allow_anon_insert_comments"
ON comments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow everyone to view approved comments
CREATE POLICY "allow_public_view_approved"
ON comments
FOR SELECT
TO anon, authenticated, public
USING (status = 'approved');

-- Allow service role (admin) full access
CREATE POLICY "allow_service_role_all"
ON comments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 4: Grant necessary permissions
GRANT SELECT, INSERT ON comments TO anon;
GRANT SELECT, INSERT ON comments TO authenticated;
GRANT ALL ON comments TO service_role;

-- Step 5: Verify
SELECT 'RLS re-enabled with working policies!' as message;
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'comments' ORDER BY cmd, policyname;
