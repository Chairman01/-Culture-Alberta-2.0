-- Add missing columns to analytics tables for Culture Alberta
-- This will fix the "screen_resolution column not found" error

-- Add missing columns to analytics_sessions table
ALTER TABLE analytics_sessions 
ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Add missing columns to analytics_events table (if needed)
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS screen_resolution TEXT;

-- Verify the tables have all required columns
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('analytics_sessions', 'analytics_events', 'analytics_page_views', 'analytics_content_views')
ORDER BY table_name, ordinal_position;

-- Test insert to verify everything works
INSERT INTO analytics_sessions (id, page_count, duration, started_at, screen_resolution) 
VALUES ('test_session_' || EXTRACT(EPOCH FROM NOW()), 1, 0, NOW(), '1920x1080')
ON CONFLICT (id) DO NOTHING;

-- Clean up test data
DELETE FROM analytics_sessions WHERE id LIKE 'test_session_%';
