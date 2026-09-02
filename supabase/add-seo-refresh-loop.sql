-- The refresh loop: what to work on, what was changed, and whether it worked.
--
-- The daily watcher (seo_daily) records site-level totals — it can say traffic
-- fell, never which page or which query. Answering "did the kiara mooswa
-- retitle work?" needs the page and query dimensions, plus a record of what was
-- changed and when. That is these three tables.
--
-- Re-running is safe (IF NOT EXISTS throughout). RLS on with no policies, same
-- as seo_daily: only the service role writes them.

-- 1. Per-page and per-query search performance, one row per day.
--    `page` and `query` default to '' rather than null so the unique
--    constraint actually holds — in Postgres, null never equals null.
--    A page row has query = '', a query row has page = '', a page+query row
--    has both. source: 'gsc' | 'bing'. surface: 'web' | 'discover' | 'news'.
create table if not exists public.seo_query_daily (
  id bigint generated always as identity primary key,
  day date not null,
  source text not null,
  surface text not null default 'web',
  page text not null default '',
  query text not null default '',
  clicks numeric not null default 0,
  impressions numeric not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  collected_at timestamptz not null default now(),
  unique (day, source, surface, page, query)
);
-- The two reads this table exists for: "this page over time" and
-- "this query over time".
create index if not exists seo_query_daily_page_day_idx on public.seo_query_daily (page, day desc) where page <> '';
create index if not exists seo_query_daily_query_day_idx on public.seo_query_daily (query, day desc) where query <> '';
alter table public.seo_query_daily enable row level security;

-- 2. The work queue. One row per planned refresh or new article, ranked.
--    The daily run takes the highest-ranked 'todo' row and nothing else, so
--    the backlog is the only thing that decides what gets worked on.
create table if not exists public.seo_backlog (
  id bigint generated always as identity primary key,
  rank int not null,
  kind text not null check (kind in ('refresh', 'new')),
  label text not null,
  target_slug text,
  cluster text,
  rationale text,
  evidence jsonb,
  status text not null default 'todo' check (status in ('todo', 'queued', 'done', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_backlog_status_rank_idx on public.seo_backlog (status, rank);
alter table public.seo_backlog enable row level security;

-- 3. One row per proposed change, from draft through to the verdict.
--    `baseline` is the 28 days before the change; `outcome` the 28 days after.
--    Nothing is compared until `applied_at` is at least 14 days old — a title
--    change takes that long to settle in the index.
create table if not exists public.seo_refreshes (
  id bigint generated always as identity primary key,
  backlog_id bigint references public.seo_backlog (id) on delete set null,
  slug text not null,
  kind text not null check (kind in ('refresh', 'new')),
  status text not null default 'queued' check (status in ('queued', 'applied', 'rejected', 'measured')),
  proposal jsonb not null,
  baseline jsonb,
  applied_at timestamptz,
  measured_at timestamptz,
  outcome jsonb,
  verdict text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_refreshes_status_idx on public.seo_refreshes (status, applied_at);
create index if not exists seo_refreshes_slug_idx on public.seo_refreshes (slug);
alter table public.seo_refreshes enable row level security;
