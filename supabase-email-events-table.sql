-- Newsletter email engagement events table
-- Run this in Supabase SQL editor to enable open/click tracking
--
-- After creating the table, add the webhook in Resend dashboard:
--   URL: https://www.culturealberta.com/api/webhooks/resend
--   Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained,
--           email.delivery_delayed, email.failed

CREATE TABLE IF NOT EXISTS newsletter_email_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  event_type    VARCHAR(50)  NOT NULL, -- 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'delivery_delayed' | 'failed'
  email_id      VARCHAR(255),          -- Resend's internal email ID
  subject       VARCHAR(500),          -- Email subject line (identifies the campaign)
  clicked_url   TEXT,                  -- Populated for 'clicked' events only
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups in the admin panel
CREATE INDEX IF NOT EXISTS idx_newsletter_events_email      ON newsletter_email_events(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_type       ON newsletter_email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_subject    ON newsletter_email_events(subject);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_created    ON newsletter_email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_email_id   ON newsletter_email_events(email_id);
