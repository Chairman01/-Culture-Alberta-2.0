-- IndexNow submission tracking.
--
-- Bing reported seven URLs that were never submitted via IndexNow: one article
-- and six job postings. Two separate causes, both structural:
--
--   1. Job postings were never submitted at all. notifySearchEngines() is only
--      called from the article and event admin routes; nothing in the jobs sync
--      pipeline touches it, so every /jobs/posting/* URL the daily sync creates
--      was invisible to IndexNow.
--
--   2. Articles written straight into the database — the normal workflow here —
--      bypass /api/admin/articles/create, which is the only place the article
--      ping fires. The flagged article was inserted that way on 2026-08-23.
--
-- Pinging from more call sites would not fix this; the next path that writes a
-- row would miss again. Instead a nightly sweeper submits anything publicly
-- visible that has not been submitted yet, and stamps it here. The per-publish
-- pings stay as the fast path, so an admin publish still reaches Bing in
-- minutes rather than waiting for the sweep.

alter table articles add column if not exists indexnow_submitted_at timestamptz;
alter table jobs     add column if not exists indexnow_submitted_at timestamptz;

comment on column articles.indexnow_submitted_at is
  'When this URL was last submitted to IndexNow. NULL = pending, picked up by /api/cron/indexnow-sweep.';
comment on column jobs.indexnow_submitted_at is
  'When this URL was last submitted to IndexNow. NULL = pending, picked up by /api/cron/indexnow-sweep.';

-- Partial indexes: the sweeper only ever reads the pending rows, which are a
-- handful out of 741 articles and 1,325 jobs. A full index on the column would
-- be almost entirely dead weight.
create index if not exists articles_indexnow_pending_idx
  on articles (created_at) where indexnow_submitted_at is null;
create index if not exists jobs_indexnow_pending_idx
  on jobs (created_at) where indexnow_submitted_at is null;

-- Everything that exists right now is marked as already handled, so deploying
-- the sweeper cannot fire a ~1,500-URL submission on its first run. Only
-- content created after this migration flows through it.
--
-- To deliberately drain the existing backlog instead — the 1,323 live job
-- postings and 139 recent articles that genuinely were never submitted — clear
-- the stamp for a window and let the sweeper work through it at its per-run
-- cap of 400:
--
--   update jobs     set indexnow_submitted_at = null
--     where status = 'active'    and created_at > now() - interval '30 days';
--   update articles set indexnow_submitted_at = null
--     where status = 'published' and created_at > now() - interval '30 days';
update articles set indexnow_submitted_at = now() where indexnow_submitted_at is null;
update jobs     set indexnow_submitted_at = now() where indexnow_submitted_at is null;
