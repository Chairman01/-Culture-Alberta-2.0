-- ========================================
-- FINAL COMPREHENSIVE FIX FOR COMMENTS RLS
-- ========================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Enable insert for all users" ON comments;
DROP POLICY IF EXISTS "Allow public to insert comments" ON comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Allow authenticated and anon to insert" ON comments;

-- Step 2: Temporarily disable RLS to test
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify the table structure
-- (This is just a comment - you can manually check the table)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'comments';

-- Step 4: Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, permissive policies

-- Allow everyone to read approved comments
CREATE POLICY "allow_read_approved_comments" ON comments
    FOR SELECT
    USING (status = 'approved');

-- Allow EVERYONE (authenticated and anonymous) to insert comments
CREATE POLICY "allow_insert_comments" ON comments
    FOR INSERT
    WITH CHECK (true);

-- Optional: Allow only authenticated users to update their own comments
-- CREATE POLICY "allow_update_own_comments" ON comments
--     FOR UPDATE
--     USING (auth.uid() = created_by)
--     WITH CHECK (auth.uid() = created_by);

-- Step 6: Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comments';
