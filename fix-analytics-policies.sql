-- Fix analytics policies for Culture Alberta
-- This will resolve the "policy already exists" error

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Allow all operations on analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Allow all operations on analytics_page_views" ON analytics_page_views;
DROP POLICY IF EXISTS "Allow all operations on analytics_sessions" ON analytics_sessions;
DROP POLICY IF EXISTS "Allow all operations on analytics_content_views" ON analytics_content_views;

-- Recreate the policies
CREATE POLICY "Allow all operations on analytics_events" ON analytics_events FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_page_views" ON analytics_page_views FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_sessions" ON analytics_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_content_views" ON analytics_content_views FOR ALL USING (true);

-- Verify the tables exist and are accessible
SELECT 'analytics_events' as table_name, COUNT(*) as row_count FROM analytics_events
UNION ALL
SELECT 'analytics_page_views' as table_name, COUNT(*) as row_count FROM analytics_page_views
UNION ALL
SELECT 'analytics_sessions' as table_name, COUNT(*) as row_count FROM analytics_sessions
UNION ALL
SELECT 'analytics_content_views' as table_name, COUNT(*) as row_count FROM analytics_content_views;
