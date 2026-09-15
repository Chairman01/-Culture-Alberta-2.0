-- Keep a member's name on their old comments in step with their profile.
--
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- comments.author_name is a snapshot taken when the comment was posted, so
-- renaming yourself on /account left every comment you had already written
-- signed with the old name. Same for notifications.actor_name, which is the
-- replier's name frozen at the moment the reply landed.
--
-- A trigger on auth.users is what covers this rather than app code: a rename
-- can arrive from the account page, from the admin, or from anything added
-- later, and all of them write the same metadata field.
--
-- The name is normalised exactly the way app/api/comments/route.ts normalises
-- it (sanitizeSingleLine: strip tags, collapse whitespace, trim, cap at 100).
-- Without that, a full_name carrying a trailing space would differ from the
-- stored author_name forever and the two would never agree.

create or replace function public.normalize_display_name(raw text)
returns text
language sql
immutable
as $function$
  select left(
           btrim(
             regexp_replace(
               regexp_replace(coalesce(raw, ''), '<[^>]*>', '', 'g'),
               '\s+', ' ', 'g'
             )
           ),
           100
         )
$function$;

create or replace function public.sync_member_display_name()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    new_name text;
begin
    new_name := public.normalize_display_name(new.raw_user_meta_data ->> 'full_name');

    -- Nothing usable to write. Leave the existing bylines alone rather than
    -- blanking a comment's author.
    if new_name = '' then
        return new;
    end if;

    update public.comments
       set author_name = new_name
     where user_id = new.id
       and author_name is distinct from new_name;

    update public.notifications
       set actor_name = new_name
     where actor_name is not null
       and comment_id in (select id from public.comments where user_id = new.id)
       and actor_name is distinct from new_name;

    return new;
end
$function$;

-- Fires only when the name actually changed. auth.users is updated on every
-- sign-in (last_sign_in_at), so an unguarded trigger would rewrite every
-- comment a member owns each time they logged in.
drop trigger if exists trg_sync_member_display_name on auth.users;
create trigger trg_sync_member_display_name
  after update on auth.users
  for each row
  when (
    public.normalize_display_name(old.raw_user_meta_data ->> 'full_name')
      is distinct from
    public.normalize_display_name(new.raw_user_meta_data ->> 'full_name')
  )
  execute function public.sync_member_display_name();

-- One-time backfill for renames that happened before the trigger existed.
update public.comments c
   set author_name = public.normalize_display_name(u.raw_user_meta_data ->> 'full_name')
  from auth.users u
 where c.user_id = u.id
   and public.normalize_display_name(u.raw_user_meta_data ->> 'full_name') <> ''
   and c.author_name is distinct from public.normalize_display_name(u.raw_user_meta_data ->> 'full_name');

update public.notifications n
   set actor_name = public.normalize_display_name(u.raw_user_meta_data ->> 'full_name')
  from public.comments c
  join auth.users u on u.id = c.user_id
 where n.comment_id = c.id
   and n.actor_name is not null
   and public.normalize_display_name(u.raw_user_meta_data ->> 'full_name') <> ''
   and n.actor_name is distinct from public.normalize_display_name(u.raw_user_meta_data ->> 'full_name');
