-- Fix RLS policies for comments table
-- This resolves the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
DROP POLICY IF EXISTS "Service role can do everything" ON comments;

-- Recreate policies with correct syntax

-- Policy 1: Anyone can insert comments (they start as 'pending')
CREATE POLICY "Anyone can insert comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Only approved comments are visible to public
CREATE POLICY "Public can view approved comments" ON comments
  FOR SELECT
  USING (status = 'approved');

-- Policy 3: Authenticated users (service role) can do everything
-- Split into separate policies for clarity
CREATE POLICY "Service role can select all" ON comments
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert" ON comments
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update" ON comments
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete" ON comments
  FOR DELETE
  USING (auth.role() = 'service_role');
