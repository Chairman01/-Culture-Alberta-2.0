-- Create analytics tables for Culture Alberta
-- This will store real visitor data and analytics

-- Analytics Events Table (main tracking table)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'page_view', 'content_view', 'newsletter_signup', etc.
  page_path TEXT,
  page_title TEXT,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page Views Table (detailed page tracking)
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_on_page INTEGER, -- seconds
  scroll_depth INTEGER, -- percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table (user session tracking)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY, -- session_id
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  language TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_count INTEGER DEFAULT 1,
  duration INTEGER -- seconds
);

-- Content Views Table (article, event, location tracking)
CREATE TABLE IF NOT EXISTS analytics_content_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'article', 'event', 'location', 'best_of'
  content_id TEXT,
  content_title TEXT,
  location TEXT, -- for location-based content
  time_spent INTEGER, -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON analytics_events(page_path);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_page_path ON analytics_page_views(page_path);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_country ON analytics_sessions(country);

CREATE INDEX IF NOT EXISTS idx_analytics_content_views_session_id ON analytics_content_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_content_views_content_type ON analytics_content_views(content_type);
CREATE INDEX IF NOT EXISTS idx_analytics_content_views_created_at ON analytics_content_views(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_content_views ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for analytics data)
CREATE POLICY "Allow all operations on analytics_events" ON analytics_events FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_page_views" ON analytics_page_views FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_sessions" ON analytics_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_content_views" ON analytics_content_views FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE analytics_events IS 'Main analytics events table for tracking all user interactions';
COMMENT ON TABLE analytics_page_views IS 'Detailed page view tracking with engagement metrics';
COMMENT ON TABLE analytics_sessions IS 'User session tracking and metadata';
COMMENT ON TABLE analytics_content_views IS 'Content-specific view tracking (articles, events, locations)';
