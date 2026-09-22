-- Alberta Data Centre Tracker: editor overrides, change log, and a snapshot of
-- the Government of Alberta Major Projects Inventory used to detect changes.
--
-- The curated base list lives in lib/data/alberta-data-centres.ts. These tables
-- let an editor correct a record without a deploy, keep a running log of what
-- changed, and let the daily cron notice when the province updates a project.

create table if not exists public.data_centre_overrides (
  id text primary key,                 -- matches DataCentre.id
  patch jsonb not null default '{}',   -- partial DataCentre fields
  note text,                           -- editor's internal note
  verified_on date,                    -- last time an editor checked the record
  updated_at timestamptz not null default now()
);

create table if not exists public.data_centre_updates (
  id bigserial primary key,
  dc_id text not null,                 -- DataCentre.id
  happened_on date not null default current_date,
  kind text not null default 'editor', -- 'editor' | 'inventory'
  headline text not null,
  detail text,
  source_url text,
  article_slug text,
  created_at timestamptz not null default now()
);
create index if not exists data_centre_updates_dc_idx on public.data_centre_updates (dc_id, happened_on desc);
create index if not exists data_centre_updates_recent_idx on public.data_centre_updates (happened_on desc, id desc);

create table if not exists public.data_centre_inventory_snapshot (
  major_project_id integer primary key,
  name text,
  stage text,
  cost numeric,
  schedule text,
  schedule_end text,
  developer text,
  municipalities text[],
  seen_at timestamptz not null default now()
);

-- Public pages read these with the anon key; only service-role routes write.
alter table public.data_centre_overrides enable row level security;
alter table public.data_centre_updates enable row level security;
alter table public.data_centre_inventory_snapshot enable row level security;

drop policy if exists "public read overrides" on public.data_centre_overrides;
create policy "public read overrides" on public.data_centre_overrides for select using (true);
drop policy if exists "public read updates" on public.data_centre_updates;
create policy "public read updates" on public.data_centre_updates for select using (true);
drop policy if exists "public read inventory snapshot" on public.data_centre_inventory_snapshot;
create policy "public read inventory snapshot" on public.data_centre_inventory_snapshot for select using (true);
