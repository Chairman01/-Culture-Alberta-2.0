-- Fix performance issues with articles table RLS policies
-- This script optimizes the articles table policies for better performance

-- Drop existing policies on articles table
DROP POLICY IF EXISTS "Allow all operations on articles" ON public.articles;

-- Create optimized policies using SELECT subqueries instead of direct auth function calls
-- This prevents the performance issue where auth functions are called for each row

-- Policy for SELECT operations (viewing articles) - allow everyone to read
CREATE POLICY "Articles are viewable by everyone" ON public.articles
  FOR SELECT
  USING (true);

-- Policy for INSERT operations (creating articles) - only authenticated users
CREATE POLICY "Articles are insertable by authenticated users" ON public.articles
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- Policy for UPDATE operations (editing articles) - only authenticated users
CREATE POLICY "Articles are updatable by authenticated users" ON public.articles
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- Policy for DELETE operations (deleting articles) - only authenticated users
CREATE POLICY "Articles are deletable by authenticated users" ON public.articles
  FOR DELETE
  USING ((SELECT auth.role()) = 'authenticated');

-- Alternative: If you want to allow all operations for now (simpler but less secure)
-- Uncomment the following and comment out the above policies:

-- DROP POLICY IF EXISTS "Articles are viewable by everyone" ON public.articles;
-- DROP POLICY IF EXISTS "Articles are insertable by authenticated users" ON public.articles;
-- DROP POLICY IF EXISTS "Articles are updatable by authenticated users" ON public.articles;
-- DROP POLICY IF EXISTS "Articles are deletable by authenticated users" ON public.articles;

-- CREATE POLICY "Allow all operations on articles" ON public.articles
--   FOR ALL USING (true);

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON public.articles(updated_at);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_type ON public.articles(type);
CREATE INDEX IF NOT EXISTS idx_articles_trending_home ON public.articles(trending_home);
CREATE INDEX IF NOT EXISTS idx_articles_trending_edmonton ON public.articles(trending_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_trending_calgary ON public.articles(trending_calgary);
CREATE INDEX IF NOT EXISTS idx_articles_featured_home ON public.articles(featured_home);
CREATE INDEX IF NOT EXISTS idx_articles_featured_edmonton ON public.articles(featured_edmonton);
CREATE INDEX IF NOT EXISTS idx_articles_featured_calgary ON public.articles(featured_calgary);

-- Verify the policies were created correctly
-- Run this to check the new policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'articles';
