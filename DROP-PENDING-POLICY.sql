-- Drop the remaining problematic policy
DROP POLICY IF EXISTS "public_can_insert_pending" ON comments;

-- Verify - should only see ONE insert policy now
SELECT 'Policy removed!' as message;
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'comments' ORDER BY cmd, policyname;
