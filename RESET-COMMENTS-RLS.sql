-- COMPLETE RLS RESET FOR COMMENTS TABLE
-- This will remove all policies and recreate them correctly

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON comments;
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
DROP POLICY IF EXISTS "Service role can do everything" ON comments;
DROP POLICY IF EXISTS "anon_can_view_approved_comments" ON comments;
DROP POLICY IF EXISTS "authenticated_can_view_approved_comments" ON comments;
DROP POLICY IF EXISTS "anon_simple_insert" ON comments;
DROP POLICY IF EXISTS "public_can_insert_pending_comments" ON comments;
DROP POLICY IF EXISTS "service_role_full_access" ON comments;
DROP POLICY IF EXISTS "public_can_view_approved_comments" ON comments;

-- Step 2: Disable RLS temporarily
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies

-- Allow anyone (anon + authenticated) to insert comments
CREATE POLICY "public_can_insert_pending_comments"
ON comments
FOR INSERT
TO public
WITH CHECK (status = 'pending');

-- Allow anyone to view approved comments
CREATE POLICY "public_can_view_approved_comments"
ON comments
FOR SELECT
TO public
USING (status = 'approved');

-- Allow service role full access (for admin)
CREATE POLICY "service_role_full_access"
ON comments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Grant permissions
GRANT SELECT, INSERT ON comments TO anon;
GRANT SELECT, INSERT ON comments TO authenticated;
GRANT ALL ON comments TO service_role;

-- Step 6: Verify
SELECT 'RLS policies reset successfully!' as message;
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'comments';
