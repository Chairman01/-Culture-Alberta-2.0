-- =============================================================================
-- CULTURE ALBERTA — SIGNUP ATTRIBUTION + NEWSLETTER TOPICS
-- =============================================================================
-- Run ONCE in the Supabase SQL editor. Safe to re-run (all statements guarded).
--
-- Two things this enables:
--   1. Telling apart readers who signed up from an article vs from the jobs
--      board, so growth from each surface can actually be measured. The
--      /api/newsletter route has been accepting a `source` field all along and
--      silently dropping it — there was nowhere to put it.
--   2. A separate jobs newsletter. Topics are per-subscriber, so a culture
--      reader never receives job emails and vice versa.
--
-- CASL note: consent to the culture newsletter is NOT consent to a jobs
-- newsletter. `topics` therefore defaults to {culture} only, and 'jobs' is
-- added solely when the reader ticks the jobs box themselves. Never backfill
-- existing rows into 'jobs' — that would be sending without express consent.
-- =============================================================================

-- 1. Newsletter topics + attribution
ALTER TABLE newsletter_subscriptions
  ADD COLUMN IF NOT EXISTS topics        TEXT[] NOT NULL DEFAULT ARRAY['culture'],
  ADD COLUMN IF NOT EXISTS signup_source TEXT,
  ADD COLUMN IF NOT EXISTS signup_path   TEXT;

COMMENT ON COLUMN newsletter_subscriptions.topics IS
  'Lists this address has given express consent to. culture | jobs. One row per email.';
COMMENT ON COLUMN newsletter_subscriptions.signup_source IS
  'Surface the subscription came from: article | jobs | events | account-signup | footer | unknown.';

-- Existing rows keep {culture}, so the current newsletter is unaffected.

-- 2. Indexes
--    GIN powers the `topics @> '{jobs}'` filter used at send time.
CREATE INDEX IF NOT EXISTS idx_newsletter_topics
  ON newsletter_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_newsletter_signup_source
  ON newsletter_subscriptions (signup_source);

-- 3. Reporting view: where accounts and subscribers actually come from.
--    Account attribution lives in auth.users.raw_user_meta_data (same place as
--    `city`), so no extra table is needed for users.
CREATE OR REPLACE VIEW signup_attribution AS
SELECT
  COALESCE(u.raw_user_meta_data ->> 'signup_source', 'unknown') AS source,
  COUNT(*)                                                       AS accounts,
  COUNT(*) FILTER (WHERE u.created_at > NOW() - INTERVAL '30 days') AS accounts_30d,
  MIN(u.created_at)                                              AS first_signup,
  MAX(u.created_at)                                              AS latest_signup
FROM auth.users u
GROUP BY 1
ORDER BY accounts DESC;

COMMENT ON VIEW signup_attribution IS
  'Accounts grouped by the surface they signed up from. Rows created before
   attribution shipped (2026-08-02) report as "unknown" — the origin of those
   is not recoverable.';

-- =============================================================================
-- Verify
-- =============================================================================
-- SELECT * FROM signup_attribution;
-- SELECT topics, COUNT(*) FROM newsletter_subscriptions GROUP BY 1;
