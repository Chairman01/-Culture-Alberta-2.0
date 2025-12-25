-- ==================================================
-- COMPLETE FIX FOR COMMENTS RLS POLICIES  
-- ==================================================
-- This script completely recreates the RLS policies
-- for the comments table to allow anonymous users
-- to insert new comments.
-- ==================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Allow public read access to approved comments" ON comments;
DROP POLICY IF EXISTS "Allow anyone to insert comments" ON comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON comments;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Enable insert access for anon users" ON comments;
DROP POLICY IF EXISTS "Allow anonymous users to insert comments" ON comments;

-- Step 2: Disable RLS temporarily to ensure we can recreate policies
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create NEW policies with proper permissions

-- Policy 1: Allow anyone (including anonymous) to INSERT comments
CREATE POLICY "comments_insert_policy"
ON comments
FOR INSERT
TO PUBLIC  -- This allows BOTH authenticated AND anonymous users
WITH CHECK (true);  -- No additional checks, allow all inserts

-- Policy 2: Allow anyone to SELECT approved comments
CREATE POLICY "comments_select_approved"
ON comments
FOR SELECT
TO PUBLIC
USING (status = 'approved');

-- Step 5: Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'comments' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is ENABLED on comments table';
  ELSE
    RAISE NOTICE 'WARNING: RLS is NOT enabled on comments table';
  END IF;
END$$;

-- Step 6: List all policies
SELECT 
  policyname, 
  cmd as operation,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'comments'
ORDER BY policyname;
