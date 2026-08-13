-- Usly v60 — beta security hardening
-- Apply after 022_wish_deletion.sql.
--
-- Goals:
-- 1. Prevent clients from directly forging in-app notifications.
-- 2. Prevent users who are not in a couple from consuming chat-media storage.
-- 3. Tighten chat media object path validation without changing the client API.

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
-- create_usly_notification is an internal helper used by database triggers.
-- It must not be callable from the browser: otherwise an authenticated client
-- could forge arbitrary notifications for a couple.
revoke execute on function public.create_usly_notification(
  uuid, uuid, text, text, text, text, uuid
) from public, anon, authenticated;

-- Trigger functions are internal implementation details too.
revoke execute on function public.notify_message_insert() from public, anon, authenticated;
revoke execute on function public.notify_feeling_change() from public, anon, authenticated;
revoke execute on function public.notify_moment_insert() from public, anon, authenticated;
revoke execute on function public.notify_wish_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Chat media
-- ---------------------------------------------------------------------------
-- Chat-media objects use <user_id>/<random-file> paths. The existing policy
-- already limits the first path segment to the authenticated user. Add the
-- missing requirement that the user must actually belong to a couple.
drop policy if exists "chat media insert" on storage.objects;
create policy "chat media insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.couple_members cm
    where cm.user_id = auth.uid()
  )
);

-- Keep the existing partner-only read boundary and own-file delete boundary.
-- No client API changes are required.

notify pgrst, 'reload schema';
