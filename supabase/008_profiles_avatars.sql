-- Usly phase 8: profiles + private avatars
-- Run once. Safe for an existing project.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Private avatar objects: a user can only manage files inside their own folder.
drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars own select" on storage.objects;
create policy "avatars own select" on storage.objects
for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.couple_members mine
      join public.couple_members partner on partner.couple_id = mine.couple_id
      where mine.user_id = auth.uid()
        and partner.user_id = (storage.foldername(name))[1]::uuid
    )
  )
);

drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Make profile changes available to the existing realtime UI.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
exception when undefined_object then
  null;
end $$;
