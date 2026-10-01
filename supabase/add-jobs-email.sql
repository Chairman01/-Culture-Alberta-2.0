-- Jobs email: frequency per subscriber, and a log of what was sent.
--
-- Consent lives where it always has: newsletter_subscriptions.topics contains
-- 'jobs'. This adds how often that subscriber asked to hear, and a log that
-- doubles as the once-a-day guard.
--
-- Existing jobs subscribers consented under wording that said "once a week",
-- so the default is weekly. Daily is only ever set by the subscriber.

alter table public.newsletter_subscriptions
  add column if not exists jobs_frequency text not null default 'weekly';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'newsletter_subscriptions_jobs_frequency_check'
  ) then
    alter table public.newsletter_subscriptions
      add constraint newsletter_subscriptions_jobs_frequency_check
      check (jobs_frequency in ('daily', 'weekly'));
  end if;
end $$;

create table if not exists public.jobs_email_log (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
  -- Mountain-time calendar day of the send. With the unique index below it is
  -- the claim: two overlapping cron runs cannot both mail the same person.
  send_date date not null,
  sent_at timestamptz not null default now(),
  frequency text not null,
  job_ids uuid[] not null default '{}',
  subject text
);

create unique index if not exists jobs_email_log_one_per_day
  on public.jobs_email_log (subscription_id, send_date);

create index if not exists jobs_email_log_recent
  on public.jobs_email_log (subscription_id, sent_at desc);

-- Service role only, like the subscriber table it hangs off.
alter table public.jobs_email_log enable row level security;

-- Email-only sign-up for the jobs email (no account). A request sits here until
-- the address owner confirms from the email we send them; only then does a
-- subscriber row get the 'jobs' topic. The row is also the proof of consent.
create table if not exists public.jobs_email_confirmations (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  city text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  signup_path text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists jobs_email_confirmations_email
  on public.jobs_email_confirmations (lower(email), created_at desc);

alter table public.jobs_email_confirmations enable row level security;
