-- =============================================================================
-- CULTURE ALBERTA — JOBS: ALL 7 MUNICIPALITIES + ATS SOURCES
-- =============================================================================
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
--
-- Two changes:
--   1. `city` opens up from calgary/edmonton to the same 7 municipalities the
--      rest of the site already has sections for.
--   2. `source` gains 'ats' — jobs read straight from an employer's own
--      applicant tracking system (Greenhouse, Lever, Ashby, Workable, Workday).
--
-- Why 'ats' matters: those feeds carry the FULL job description and an
-- apply URL pointing at the employer's own portal. Aggregator rows carry a
-- ~250-char snippet and bounce the candidate to a competing job board, which
-- is why Google refuses to index them (219 of 223 URLs in the 2026-08-02
-- "Discovered - currently not indexed" export were exactly those pages).
-- =============================================================================

-- 1. Cities — match the slugs already used by the newsletter and city sections
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_city_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_city_check CHECK (
  city IN (
    'calgary', 'edmonton', 'red-deer', 'lethbridge',
    'medicine-hat', 'grande-prairie', 'fort-mcmurray'
  )
);

-- 2. Sources — 'ats' joins the existing set
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check CHECK (
  source IN ('adzuna', 'manual', 'jobbank', 'ats')
);

-- 3. Which ATS a row came from, for provenance and per-provider debugging.
--    NULL for every non-ATS row.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS ats_provider TEXT,
  ADD COLUMN IF NOT EXISTS ats_board    TEXT;

COMMENT ON COLUMN jobs.ats_provider IS
  'greenhouse | lever | ashby | workable | workday. NULL for non-ATS rows.';
COMMENT ON COLUMN jobs.ats_board IS
  'Board token the row was ingested from, e.g. "cenovus". Lets one employer''s
   postings be re-synced or purged independently of the rest.';

CREATE INDEX IF NOT EXISTS idx_jobs_ats_board ON jobs (ats_board)
  WHERE ats_board IS NOT NULL;

-- 4. City pages should only go live once they have real supply — an empty
--    municipality page reads as abandoned to both readers and Google.
CREATE OR REPLACE VIEW jobs_city_coverage AS
SELECT
  city,
  COUNT(*)                                                  AS active_jobs,
  COUNT(*) FILTER (WHERE source = 'ats')                    AS ats_jobs,
  COUNT(*) FILTER (WHERE description_html IS NOT NULL)      AS indexable_jobs,
  COUNT(DISTINCT ats_board) FILTER (WHERE ats_board IS NOT NULL) AS employers
FROM jobs
WHERE status = 'active'
GROUP BY city
ORDER BY active_jobs DESC;

-- 5. Retire the aggregator rows.
--    Expired rather than deleted: /jobs/posting/* pages stay resolvable for
--    anyone holding a link or tracking one under Account -> My jobs, they just
--    drop off the board, out of the sitemap and out of the index. Delete them
--    later once the tracker has moved on.
UPDATE jobs SET status = 'expired'
WHERE source = 'adzuna' AND status = 'active';

-- =============================================================================
-- Verify
-- =============================================================================
-- SELECT * FROM jobs_city_coverage;
-- SELECT source, status, COUNT(*) FROM jobs GROUP BY 1,2 ORDER BY 1,2;
