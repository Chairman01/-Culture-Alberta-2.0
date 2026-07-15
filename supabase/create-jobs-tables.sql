-- =============================================================================
-- CULTURE ALBERTA - JOBS PLATFORM TABLES
-- =============================================================================
-- Run this ONCE in the Supabase SQL Editor (or via MCP apply_migration).
-- Creates:
--   jobs        — aggregated + manual job postings (public read, service writes)
--   saved_jobs  — per-user saved jobs / application tracker (RLS per user)
-- =============================================================================

-- 1. Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'adzuna' CHECK (source IN ('adzuna', 'manual', 'jobbank')),
  source_id TEXT,                          -- NULL for manual postings
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('calgary', 'edmonton')),
  location_raw TEXT,
  category TEXT,
  description_snippet TEXT,                -- plain text, from aggregator feeds
  description_html TEXT,                   -- full description; manual postings only
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_label TEXT,
  employment_type TEXT,                    -- FULL_TIME / PART_TIME / CONTRACT / ...
  apply_url TEXT NOT NULL,
  source_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  valid_through TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'draft')),
  is_manual BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (source, source_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_city_status ON jobs(city, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_posted ON jobs(status, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_valid_through ON jobs(valid_through);

-- 3. RLS: public can read active + expired (expired stays readable so job
--    detail pages and the tracker keep working); drafts hidden.
--    Writes go through the service role only (bypasses RLS).
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_jobs" ON jobs;
CREATE POLICY "public_read_jobs"
  ON jobs FOR SELECT
  USING (status IN ('active', 'expired'));

GRANT SELECT ON jobs TO anon;
GRANT SELECT ON jobs TO authenticated;

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_jobs_timestamp ON jobs;
CREATE TRIGGER update_jobs_timestamp
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- =============================================================================

-- 5. Saved jobs / application tracker
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id, created_at DESC);

-- 6. RLS: users can only see/manage their own rows
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_saved_jobs" ON saved_jobs;
CREATE POLICY "own_saved_jobs"
  ON saved_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_jobs TO authenticated;

-- 7. updated_at trigger
DROP TRIGGER IF EXISTS update_saved_jobs_timestamp ON saved_jobs;
CREATE TRIGGER update_saved_jobs_timestamp
  BEFORE UPDATE ON saved_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Done! Jobs board + tracker tables are ready.
