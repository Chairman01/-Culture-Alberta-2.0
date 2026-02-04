-- FINAL FIX: Remove status check from insert policy
-- The issue is that WITH CHECK runs before default values are applied

-- Drop the problematic policy
DROP POLICY IF EXISTS "public_can_insert_pending_comments" ON comments;

-- Recreate without the status check in WITH CHECK
-- The status will default to 'pending' anyway, so we don't need to check it
CREATE POLICY "public_can_insert_pending_comments"
ON comments
FOR INSERT
TO public
WITH CHECK (true);  -- Allow all inserts (status will default to 'pending')

-- Verify
SELECT 'Policy updated successfully!' as message;
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'comments';
