-- Simple fix: Drop all policies and recreate with permissive settings
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comments';

-- Drop ALL existing policies on comments table
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
DROP POLICY IF EXISTS "Service role can do everything" ON comments;
DROP POLICY IF EXISTS "Service role can select all" ON comments;
DROP POLICY IF EXISTS "Service role can insert" ON comments;
DROP POLICY IF EXISTS "Service role can update" ON comments;
DROP POLICY IF EXISTS "Service role can delete" ON comments;

-- Create simple, permissive policies
-- Policy 1: Allow anonymous users to INSERT comments
CREATE POLICY "allow_anon_insert" ON comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Allow anyone to SELECT approved comments
CREATE POLICY "allow_select_approved" ON comments
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Policy 3: Allow authenticated users to do everything (for admin)
CREATE POLICY "allow_authenticated_all" ON comments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'comments';
