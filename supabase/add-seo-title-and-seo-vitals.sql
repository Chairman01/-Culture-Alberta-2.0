-- Applied to production 2026-09-01 (migration: add_seo_title_and_seo_vitals).
-- Kept here for the record; re-running is safe (IF NOT EXISTS throughout).

-- 1. Editor-written <title> override. Nullable: the page falls back to a
--    word-boundary truncation of the headline (lib/seo/title.ts).
alter table public.articles add column if not exists seo_title text;

-- 2. One row per (day, source, metric, segment). Written only by the
--    /api/cron/seo-vitals route with the service role. RLS on, no policies:
--    the anon key can neither read nor write it.
create table if not exists public.seo_daily (
  id bigint generated always as identity primary key,
  day date not null,
  source text not null,
  metric text not null,
  segment text not null default 'all',
  value numeric not null,
  collected_at timestamptz not null default now(),
  unique (day, source, metric, segment)
);
create index if not exists seo_daily_source_metric_day_idx on public.seo_daily (source, metric, segment, day desc);
alter table public.seo_daily enable row level security;

-- 3. Fired alerts, one per (day, rule), so a rule that stays tripped for a week
--    produces one notification per day and never more.
create table if not exists public.seo_alerts (
  id bigint generated always as identity primary key,
  day date not null,
  rule text not null,
  severity text not null,
  message text not null,
  details jsonb,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (day, rule)
);
alter table public.seo_alerts enable row level security;
