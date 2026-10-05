-- One row per alert email sent to the whole list (AMBER Alerts and the like).
--
-- The unique (article_id, kind) index is the double-send guard: the row is
-- inserted BEFORE any mail goes out, so a second click, a second tab or a
-- retried request hits the constraint instead of mailing everyone again.
-- An article gets at most one 'alert', one 'update' (the follow-up when the
-- alert is cancelled) and one 'story' (a regular everyone-send).
--
-- A row stuck at status 'sending' means a send died part-way. It deliberately
-- keeps blocking: some readers already have the email, and a duplicate is worse
-- than a gap. Clear it by hand only after checking Resend.
--
-- Service-role only: RLS on, no policies.

create table if not exists public.newsletter_alert_sends (
  id          uuid primary key default gen_random_uuid(),
  article_id  text not null,
  kind        text not null check (kind in ('alert', 'update', 'story')),
  label       text not null,
  subject     text not null,
  status      text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  recipients  integer not null default 0,
  sent        integer not null default 0,
  failed      integer not null default 0,
  errors      jsonb not null default '[]'::jsonb,
  sent_by     text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists newsletter_alert_sends_article_kind
  on public.newsletter_alert_sends (article_id, kind);

alter table public.newsletter_alert_sends enable row level security;
