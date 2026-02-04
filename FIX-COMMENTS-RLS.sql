-- FIX FOR RLS POLICY ISSUE
-- Run this in Supabase SQL Editor to fix the comment insertion issue

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;

-- Create a new policy that properly allows anonymous inserts
CREATE POLICY "Enable insert for anonymous users" ON comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify the policy was created
SELECT 'RLS policy updated successfully!' as message;

-- Test by checking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comments';
