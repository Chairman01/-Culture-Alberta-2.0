-- Per-writer admin accounts, and the reject-with-a-reason review trail.
--
-- Safe to run BEFORE the code deploy: everything here is additive. Nothing that
-- is live today reads these columns, and the login route keeps working off the
-- environment variables until the new code lands.
--
-- Why this is needed
-- ------------------
-- There was exactly one contributor login (CONTRIBUTOR_USERNAME /
-- CONTRIBUTOR_PASSWORD_HASH in the environment). Two writers sharing it would
-- share an identity, so the per-writer draft scoping in
-- /api/admin/articles -- which filters on the session's own name -- would have
-- shown each of them the other's unfinished work, and let them overwrite it.
-- Every draft in the review queue would also have carried the same byline, so
-- there would have been no way to tell who wrote what.

BEGIN;

-- ── admin_users ─────────────────────────────────────────────────────────────
-- One row per person who can sign in to /admin. Passwords are bcrypt hashes,
-- never plain text; the app hashes before insert and only ever compares.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored lower-cased so logins are case-insensitive. The app lower()s the
  -- submitted username before it looks the row up.
  username      text NOT NULL UNIQUE CHECK (username = lower(username) AND length(username) BETWEEN 2 AND 40),
  -- The byline. This is what goes in articles.author, so it is written the way
  -- a reader should see it: "Tiffany", not "tiffany".
  display_name  text NOT NULL CHECK (length(trim(display_name)) > 0),
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'contributor' CHECK (role IN ('admin', 'contributor')),
  -- Offboarding sets this false rather than deleting the row, so the articles
  -- the person wrote keep a resolvable author.
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- The login path looks up exactly one row by username on every sign-in.
CREATE INDEX IF NOT EXISTS admin_users_username_active_idx
  ON public.admin_users (username) WHERE is_active;

-- This table holds password hashes. RLS on with NO policies at all means anon
-- and authenticated get nothing, ever -- not even a row count. Only the service
-- role, which bypasses RLS, can read it, and that key never leaves the server.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;

-- ── articles: the review trail ──────────────────────────────────────────────
-- Rejected work is NOT deleted any more. It keeps status='draft' -- which the
-- anon RLS policy already hides, since that policy only exposes
-- status='published' -- and is moved out of the queue by review_status instead.
-- Reusing 'draft' rather than inventing a new status value means none of the
-- ~50 places in the app that reason about status have to learn a new one, and
-- there is no path by which a rejected draft can become publicly visible.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_note   text,
  ADD COLUMN IF NOT EXISTS reviewed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by   text,
  -- Who wrote it, by account rather than by byline string. Scoping a writer to
  -- their own drafts on a name match breaks the moment two people share a first
  -- name or someone's display name is edited.
  ADD COLUMN IF NOT EXISTS author_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- Anything already published got there by being approved, whatever the column
-- default says. Drafts stay 'pending', which is where the queue looks.
UPDATE public.articles SET review_status = 'approved' WHERE status = 'published';

-- The review queue reads exactly this predicate.
CREATE INDEX IF NOT EXISTS articles_review_queue_idx
  ON public.articles (created_at DESC) WHERE status = 'draft' AND review_status = 'pending';

-- A writer's own-work list reads exactly this one.
CREATE INDEX IF NOT EXISTS articles_author_user_idx
  ON public.articles (author_user_id, created_at DESC) WHERE author_user_id IS NOT NULL;

-- ── newsletter_config: the writer's handover ────────────────────────────────
-- Writers prepare editions and never send them. Picking and ordering the
-- stories already had somewhere to live; the subject line they propose and the
-- note they leave for whoever sends it did not, so it was happening in chat
-- and getting lost.
ALTER TABLE public.newsletter_config
  ADD COLUMN IF NOT EXISTS proposed_subject text,
  ADD COLUMN IF NOT EXISTS prepare_note     text,
  ADD COLUMN IF NOT EXISTS prepared_by      text,
  ADD COLUMN IF NOT EXISTS prepared_at      timestamptz;

COMMIT;

-- ── After running ───────────────────────────────────────────────────────────
-- Create the first accounts from /admin/team once the code is deployed. Do not
-- INSERT rows by hand here: password_hash must be a bcrypt hash, and the Team
-- page is what generates it. A hand-typed plain-text password in this column
-- will simply never match at login.
