-- Usly: shared private moments with optional photos.
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists moments_couple_created_idx on public.moments(couple_id, created_at desc);

alter table public.moments enable row level security;

drop policy if exists "moments_select_for_members" on public.moments;
drop policy if exists "moments_insert_for_members" on public.moments;
drop policy if exists "moments_delete_own" on public.moments;

create policy "moments_select_for_members"
on public.moments for select to authenticated
using (public.is_couple_member(couple_id));

create policy "moments_insert_for_members"
on public.moments for insert to authenticated
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

create policy "moments_delete_own"
on public.moments for delete to authenticated
using (user_id = auth.uid() and public.is_couple_member(couple_id));

grant select, insert, delete on public.moments to authenticated;

insert into storage.buckets (id, name, public)
values ('moments', 'moments', false)
on conflict (id) do nothing;

drop policy if exists "moment_images_select" on storage.objects;
drop policy if exists "moment_images_insert" on storage.objects;
drop policy if exists "moment_images_delete" on storage.objects;

create policy "moment_images_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'moments'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
);

create policy "moment_images_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'moments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
);

create policy "moment_images_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'moments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'moments'
  ) then
    alter publication supabase_realtime add table public.moments;
  end if;
end $$;

alter table public.moments replica identity full;
notify pgrst, 'reload schema';
