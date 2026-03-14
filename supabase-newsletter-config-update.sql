-- Add last_sent_at column to newsletter_config
-- Run this in the Supabase SQL editor (once only)
--
-- This tracks when each city newsletter was last sent so the admin panel
-- can show a "Sent today at X:XX AM" badge and warn against double-sending.

ALTER TABLE newsletter_config
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE;

-- Optional: index for fast lookup (newsletter_config is small, so low priority)
-- CREATE INDEX IF NOT EXISTS idx_newsletter_config_last_sent
--   ON newsletter_config(last_sent_at);
