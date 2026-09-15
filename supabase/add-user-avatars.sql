-- Profile pictures for readers (the "avatars" storage bucket).
--
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Files live at avatars/{user_id}/{timestamp}.jpg. Every write policy checks
-- that the first path segment is the caller's own uid, so a signed-in reader
-- can only ever touch their own folder — one rule covers insert, update and
-- delete, and there is no way to overwrite somebody else's picture.
--
-- The bucket is public-read because the avatar renders in the nav for the
-- reader and on the account page, same as article images. Nothing private
-- belongs in here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB. The browser downscales to a 512px square (~50-100KB) before
           -- uploading, so this is a backstop against a client that skips that.
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read: anyone. A public bucket still needs a select policy for the object to
-- be served through the RLS-aware storage API.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Write: only inside your own uid folder, only when signed in.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
