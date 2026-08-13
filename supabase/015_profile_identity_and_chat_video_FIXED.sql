-- Usly v25: gender, zodiac, profile background and chat video circles.
-- Run once in Supabase SQL Editor.

alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists zodiac text;
alter table public.profiles add column if not exists background_url text;

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender is null or gender in ('male','female'));

insert into storage.buckets (id, name, public)
values ('profile-backgrounds', 'profile-backgrounds', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists "backgrounds own insert" on storage.objects;
create policy "backgrounds own insert" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "backgrounds couple select" on storage.objects;
create policy "backgrounds couple select" on storage.objects for select to authenticated
using (bucket_id = 'profile-backgrounds' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or exists (
    select 1 from public.couple_members mine
    join public.couple_members partner on partner.couple_id = mine.couple_id
    where mine.user_id = auth.uid() and partner.user_id = (storage.foldername(name))[1]::uuid
  )
));

drop policy if exists "backgrounds own update" on storage.objects;
create policy "backgrounds own update" on storage.objects for update to authenticated
using (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "backgrounds own delete" on storage.objects;
create policy "backgrounds own delete" on storage.objects for delete to authenticated
using (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat media insert" on storage.objects;
create policy "chat media insert" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat media select" on storage.objects;
create policy "chat media select" on storage.objects for select to authenticated
using (bucket_id = 'chat-media' and exists (
  select 1
  from public.couple_members mine
  join public.couple_members sender on sender.couple_id = mine.couple_id
  where mine.user_id = auth.uid() and sender.user_id = (storage.foldername(name))[1]::uuid
));

drop policy if exists "chat media delete" on storage.objects;
create policy "chat media delete" on storage.objects for delete to authenticated
using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists duration_ms integer;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check check (
  (char_length(trim(body)) between 1 and 2000)
  or media_type = 'video'
);
alter table public.messages drop constraint if exists messages_media_type_check;
alter table public.messages add constraint messages_media_type_check check (media_type is null or media_type in ('video'));

drop function if exists public.get_my_us(uuid);

create function public.get_my_us(target_couple_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  background_url text,
  gender text,
  zodiac text,
  joined_at timestamptz,
  is_me boolean,
  couple_name text,
  relationship_started_at date
)
language sql stable security definer set search_path = public
as $$
  select cm.user_id, coalesce(p.display_name,''), p.avatar_url, p.background_url, p.gender, p.zodiac,
    cm.joined_at, (cm.user_id = auth.uid()), c.name, c.relationship_started_at
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  left join public.profiles p on p.id = cm.user_id
  where cm.couple_id = target_couple_id and public.is_couple_member(target_couple_id)
  order by cm.joined_at asc;
$$;

grant execute on function public.get_my_us(uuid) to authenticated;
alter table public.profiles replica identity full;
alter table public.messages replica identity full;
notify pgrst, 'reload schema';
