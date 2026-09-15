-- Notify a comment's author when someone likes it.
--
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Replies already do this: trg_comment_reply_notification writes a
-- notifications row and the API sends an email. Likes did nothing at all.
-- This mirrors the reply trigger, with three differences that fall out of how
-- likes work.
--
-- 1. Likes are anonymous. comment_likes identifies a liker by client_id — a
--    browser-local string — so the notification reads "Someone liked your
--    comment" and actor_name stays null.
--
-- 2. Likes toggle. Like, unlike, like again inserts a second row, which would
--    be a second notification for the same person liking the same comment.
--    actor_key holds the liker's client_id and a unique index makes the insert
--    idempotent, so repeat likes are silent.
--
-- 3. No email. A like is worth a badge, not an inbox. Replies stay the only
--    thing that mails.

-- --------------------------------------------------------------------------
-- Who liked it, when we can tell.
--
-- Anonymous readers can like, so this stays nullable. It exists to suppress
-- self-likes: without it, liking your own comment notifies you about yourself.
-- --------------------------------------------------------------------------
alter table public.comment_likes
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- --------------------------------------------------------------------------
-- Dedupe key for like notifications (the liker's client_id).
-- --------------------------------------------------------------------------
alter table public.notifications
  add column if not exists actor_key text;

-- One like notification per (recipient, comment, liker). Partial, so the
-- existing reply rows — which have no actor_key — are untouched.
create unique index if not exists notifications_like_once_idx
  on public.notifications (user_id, comment_id, actor_key)
  where type = 'like';

-- --------------------------------------------------------------------------
-- The trigger.
-- --------------------------------------------------------------------------
create or replace function public.handle_comment_like_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    comment_author uuid;
    comment_body   text;
    comment_article text;
    art_slug       text;
begin
    select user_id, content, article_id
      into comment_author, comment_body, comment_article
      from public.comments
     where id = new.comment_id;

    -- Posted by a guest: nobody to notify.
    if comment_author is null then
        return new;
    end if;

    -- Liking your own comment.
    if new.user_id is not null and new.user_id = comment_author then
        return new;
    end if;

    select slug into art_slug from public.articles where id = comment_article;

    insert into public.notifications
        (user_id, type, actor_name, comment_id, article_id, article_slug, excerpt, actor_key)
    values
        (comment_author, 'like', null, new.comment_id, comment_article, art_slug,
         left(comment_body, 140), new.client_id)
    on conflict do nothing;

    return new;
end
$function$;

drop trigger if exists trg_comment_like_notification on public.comment_likes;
create trigger trg_comment_like_notification
  after insert on public.comment_likes
  for each row execute function public.handle_comment_like_notification();
