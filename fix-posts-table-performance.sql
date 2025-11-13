-- Fix performance issues with posts table RLS policies
-- This script addresses the Supabase performance warnings

-- First, let's see what policies exist on the posts table
-- (You can run this in Supabase SQL Editor to check current policies)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'posts';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Posts are manageable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Create optimized policies that use SELECT subqueries instead of direct auth function calls
-- This prevents the performance issue where auth functions are called for each row

-- Policy for SELECT operations (viewing posts)
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT
  USING (true);

-- Policy for INSERT operations (creating posts)
CREATE POLICY "Posts are insertable by authenticated users" ON public.posts
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- Policy for UPDATE operations (editing posts)
CREATE POLICY "Posts are updatable by authenticated users" ON public.posts
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- Policy for DELETE operations (deleting posts)
CREATE POLICY "Posts are deletable by authenticated users" ON public.posts
  FOR DELETE
  USING ((SELECT auth.role()) = 'authenticated');

-- Alternative approach: If you want to allow all operations for now (simpler but less secure)
-- Uncomment the following and comment out the above policies:

-- DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
-- DROP POLICY IF EXISTS "Posts are insertable by authenticated users" ON public.posts;
-- DROP POLICY IF EXISTS "Posts are updatable by authenticated users" ON public.posts;
-- DROP POLICY IF EXISTS "Posts are deletable by authenticated users" ON public.posts;

-- CREATE POLICY "Allow all operations on posts" ON public.posts
--   FOR ALL USING (true);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON public.posts(updated_at);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author);

-- Verify the policies were created correctly
-- Run this to check the new policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'posts';
