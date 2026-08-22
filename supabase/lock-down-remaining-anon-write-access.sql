-- Close the tables the public anon key can still write, and the second email leak.
--
-- ⚠️  RUN THIS ONLY AFTER the commit "Server-side writes stop using the public
--     anon key" is deployed and verified in production.
--
--     Every table below was writable by anon for one reason: the app itself
--     wrote to it with the anon key. That deploy moves all of those writes to
--     the service role, which bypasses RLS. Running this SQL first would break
--     comments, likes, poll votes, event editing, newsletter config, analytics
--     and image uploads all at once.
--
-- What this closes
-- ----------------
-- * newsletter_email_events had `SELECT USING (true)` for anon and stores the
--   subscriber's email on every row. Locking newsletter_subscriptions did not
--   help: the same addresses were readable here the whole time. Verified with
--   the public key before writing this.
-- * newsletter_config decides which articles each edition carries. Anyone could
--   rewrite it, and therefore choose what ~1,700 people receive.
-- * events was `FOR ALL USING (true)` — the whole calendar was editable and
--   deletable by anyone who read the browser bundle.
-- * comments could be inserted with status='approved', skipping moderation
--   entirely.
-- * article_likes / comment_likes / poll_votes / tool_likes had
--   `DELETE USING (true)`, so anyone could wipe every like and vote on the site.
--
-- Deliberately NOT changed
-- ------------------------
-- Public SELECT stays on comments, likes, votes and tool counters. Those are
-- read by the signed-in account page and are public numbers anyway; removing
-- reads buys nothing and risks breaking the page. Only the write paths close.
--
-- Tables whose only policy is already SELECT (jobs, polls, poll_options,
-- slug_redirects) need nothing: RLS denies writes without a permissive policy,
-- so their leftover grants are inert.

BEGIN;

-- ── newsletter_email_events — the second copy of every subscriber address ────
DROP POLICY IF EXISTS "allow_select_email_events" ON public.newsletter_email_events;
DROP POLICY IF EXISTS "allow_insert_email_events" ON public.newsletter_email_events;
-- The existing "Service role only" policy is USING (false). Policies are OR'd,
-- so it never restricted anything while the two above existed.
REVOKE ALL ON public.newsletter_email_events FROM anon, authenticated;

-- ── newsletter_config — what each edition sends ─────────────────────────────
DROP POLICY IF EXISTS "Allow all access" ON public.newsletter_config;
REVOKE ALL ON public.newsletter_config FROM anon, authenticated;

-- ── events ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on events" ON public.events;

-- Reads stay public, but only for published events — same shape as the articles
-- policy. Kept rather than removed because event pages are rendered at build
-- time, where the service-role key is not guaranteed to be present.
CREATE POLICY "Public can read published events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.events FROM anon, authenticated;

-- ── analytics ───────────────────────────────────────────────────────────────
-- Written server-side only. Anyone could previously wipe or forge all of it.
DROP POLICY IF EXISTS "Allow all operations on analytics_events"         ON public.analytics_events;
DROP POLICY IF EXISTS "Allow all operations on analytics_page_views"     ON public.analytics_page_views;
DROP POLICY IF EXISTS "Allow all operations on analytics_sessions"       ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow all operations on analytics_content_views"  ON public.analytics_content_views;
REVOKE ALL ON public.analytics_events        FROM anon, authenticated;
REVOKE ALL ON public.analytics_page_views    FROM anon, authenticated;
REVOKE ALL ON public.analytics_sessions      FROM anon, authenticated;
REVOKE ALL ON public.analytics_content_views FROM anon, authenticated;

-- ── major_projects_seen ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "major_projects_seen_all_access" ON public.major_projects_seen;
REVOKE ALL ON public.major_projects_seen FROM anon, authenticated;

-- ── comments — moderation is no longer optional ─────────────────────────────
-- The old INSERT policy allowed status IN ('pending','approved'), so a caller
-- going straight to the database could publish a pre-approved comment and never
-- appear in the moderation queue. Inserts now happen server-side only.
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.comments FROM anon, authenticated;
-- "Public can view approved comments" (SELECT, status='approved') is left in
-- place: the account page reads it from the browser.

-- ── likes, votes and tool counters ──────────────────────────────────────────
-- All four had DELETE USING (true): one request could remove every like and
-- vote on the site. Writes now go through the API routes on the service role.
DROP POLICY IF EXISTS "anon insert article_likes" ON public.article_likes;
DROP POLICY IF EXISTS "anon delete article_likes" ON public.article_likes;
DROP POLICY IF EXISTS "anon insert comment_likes" ON public.comment_likes;
DROP POLICY IF EXISTS "anon delete comment_likes" ON public.comment_likes;
DROP POLICY IF EXISTS "anon insert poll_votes"    ON public.poll_votes;
DROP POLICY IF EXISTS "anon delete poll_votes"    ON public.poll_votes;
DROP POLICY IF EXISTS "anon insert tool_likes"    ON public.tool_likes;
DROP POLICY IF EXISTS "anon delete tool_likes"    ON public.tool_likes;
DROP POLICY IF EXISTS "anon insert tool_usage"    ON public.tool_usage;
DROP POLICY IF EXISTS "anon insert tool_feedback" ON public.tool_feedback;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.article_likes, public.comment_likes, public.poll_votes,
     public.tool_likes, public.tool_usage, public.tool_feedback
  FROM anon, authenticated;
-- The "anon select ..." policies stay: these are public counts.

-- ── storage: the Article-image bucket ───────────────────────────────────────
-- The upload policy checked only the bucket name, so anyone on the internet
-- could put files in it — free hosting on our domain, and our storage bill.
-- Uploads are authenticated in /api/upload/image and now run as the service
-- role, which does not need a policy. Reads are unaffected: the bucket is
-- public, and public buckets serve objects without consulting RLS.
DROP POLICY IF EXISTS "Allow public uploads bvy5g_0" ON storage.objects;

COMMIT;

-- ── Verify afterwards ───────────────────────────────────────────────────────
-- With the ANON key, all of these should now fail or return nothing:
--   GET  /rest/v1/newsletter_email_events?select=email   → permission denied
--   GET  /rest/v1/newsletter_config?select=city          → permission denied
--   POST /rest/v1/events                                 → permission denied
--   POST /rest/v1/comments                               → permission denied
-- And these should still work, because they are what readers actually do:
--   GET  /rest/v1/events?status=eq.published             → 200
--   GET  /rest/v1/comments?status=eq.approved            → 200
-- In the app: post a comment, like an article, vote in the poll, save an event
-- in /admin/events, upload an image, and subscribe a throwaway address.
