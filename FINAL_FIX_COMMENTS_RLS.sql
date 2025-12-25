/*
=====================================================
COMMENTS RLS FIX - RUN THIS IN SUPABASE SQL EDITOR
=====================================================

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
Then paste and run this ENTIRE script.

This will:
1. Drop all existing conflicting policies
2. Temporarily disable RLS
3. Re-enable RLS with proper policies
4. Allow anonymous users to insert comments
=====================================================
*/

-- Step 1: Drop ALL existing policies on comments table
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
    DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
    DROP POLICY IF EXISTS "Enable insert for all users" ON comments;
    DROP POLICY IF EXISTS "Allow public to insert comments" ON comments;
    DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
    DROP POLICY IF EXISTS "Allow authenticated and anon to insert" ON comments;
    DROP POLICY IF EXISTS "allow_read_approved_comments" ON comments;
    DROP POLICY IF EXISTS "allow_insert_comments" ON comments;
    
    RAISE NOTICE 'All existing policies dropped';
END $$;

-- Step 2: Disable RLS temporarily
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create NEW permissive policies

-- Allow everyone to read approved comments
CREATE POLICY "allow_read_approved_comments" 
ON comments 
FOR SELECT 
USING (status = 'approved');

-- Allow EVERYONE (including anonymous users) to insert comments
CREATE POLICY "allow_insert_comments" 
ON comments 
FOR INSERT 
WITH CHECK (true);

-- Step 5: Verify the policies were created
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'comments';

/*
Expected output:
- "allow_read_approved_comments" with cmd = 'SELECT'
- "allow_insert_comments" with cmd = 'INSERT'

Both should show permissive = 'PERMISSIVE'
*/
