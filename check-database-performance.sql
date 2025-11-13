-- Check current database performance and policy issues
-- Run this script in Supabase SQL Editor to diagnose performance problems

-- 1. Check all policies on posts table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- 2. Check all policies on articles table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'articles'
ORDER BY policyname;

-- 3. Check for problematic auth function usage in policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual 
FROM pg_policies 
WHERE qual LIKE '%auth.%' 
  AND qual NOT LIKE '%(SELECT auth.%'
ORDER BY tablename, policyname;

-- 4. Check table sizes and row counts
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE tablename IN ('posts', 'articles')
ORDER BY tablename;

-- 5. Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('posts', 'articles')
ORDER BY tablename, indexname;

-- 6. Check for duplicate policies (multiple permissive policies for same role/action)
SELECT 
  tablename,
  roles,
  cmd,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename IN ('posts', 'articles')
GROUP BY tablename, roles, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, roles, cmd;
