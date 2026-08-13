-- Lock down the two tables the public anon key can currently rewrite.
--
-- ⚠️  RUN THIS ONLY AFTER the branch security/contributor-approval-and-lockdown
--     is deployed to production. It removes access the currently-deployed code
--     still depends on. Running it early takes article publishing and newsletter
--     signup down until the deploy lands.
--
-- Why this is needed
-- ------------------
-- `articles` had:   CREATE POLICY "Allow all operations on articles"
--                     ON articles FOR ALL USING (true);
-- with anon holding INSERT/UPDATE/DELETE grants. The anon key is public by
-- design -- it ships in the browser bundle -- so that combination let anyone on
-- the internet edit or delete all 665 articles. `newsletter_subscriptions` was
-- the same shape over 1,654 subscriber email addresses.
--
-- Both policies existed because the app itself wrote with the anon key. The
-- deploy moves every one of those paths to the service role, which bypasses RLS
-- entirely, so nothing in the app needs these grants any more.
--
-- Verify afterwards with the anon key: reading a published article should still
-- return 200, and `newsletter_subscriptions` should return an empty set.

BEGIN;

-- ── articles ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on articles" ON public.articles;

-- Public reads stay working, but only for published rows: sitemaps, feeds, the
-- article page and the city hubs all filter to status='published' already.
-- Drafts awaiting approval in /admin/review become invisible to anon, which is
-- the point -- a contributor's unapproved work should not be fetchable by URL.
CREATE POLICY "Public can read published articles"
  ON public.articles FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- No write policy for anon/authenticated at all. Admin writes go through the
-- service role, which is not subject to RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.articles FROM anon, authenticated;

-- ── newsletter_subscriptions ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on newsletter_subscriptions"
  ON public.newsletter_subscriptions;

-- No policy replaces it. Signup, unsubscribe, the admin list and the send job
-- all run server-side on the service role after the deploy. With RLS enabled
-- and zero policies, anon and authenticated see nothing.
REVOKE ALL ON public.newsletter_subscriptions FROM anon, authenticated;

COMMIT;
