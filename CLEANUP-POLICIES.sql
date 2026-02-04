-- COMPLETE CLEANUP: Remove duplicate policies
-- Drop ALL insert policies (there are duplicates)

DROP POLICY IF EXISTS "public_can_insert_pending_comments" ON comments;
DROP POLICY IF EXISTS "public_can_insert_pending_comments_comments" ON comments;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;

-- Now create ONE clean insert policy
CREATE POLICY "allow_public_insert"
ON comments
FOR INSERT
TO public
WITH CHECK (true);

-- Verify - should only see ONE insert policy now
SELECT 'Policies cleaned up!' as message;
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'comments' ORDER BY cmd, policyname;
