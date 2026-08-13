-- Usly: private 18+ room for couples.
-- Run once in Supabase SQL Editor.

create table if not exists public.couple_secret_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists couple_secret_notes_idx on public.couple_secret_notes(couple_id, created_at desc);
alter table public.couple_secret_notes enable row level security;
drop policy if exists couple_secret_notes_select on public.couple_secret_notes;
create policy couple_secret_notes_select on public.couple_secret_notes for select using (public.is_couple_member(couple_id));
drop policy if exists couple_secret_notes_insert on public.couple_secret_notes;
create policy couple_secret_notes_insert on public.couple_secret_notes for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
drop policy if exists couple_secret_notes_delete on public.couple_secret_notes;
create policy couple_secret_notes_delete on public.couple_secret_notes for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

create table if not exists public.couple_secret_desires (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  intensity integer not null check (intensity between 1 and 10),
  created_at timestamptz not null default now()
);

create index if not exists couple_secret_desires_idx on public.couple_secret_desires(couple_id, created_at desc);
alter table public.couple_secret_desires enable row level security;
drop policy if exists couple_secret_desires_select on public.couple_secret_desires;
create policy couple_secret_desires_select on public.couple_secret_desires for select using (public.is_couple_member(couple_id));
drop policy if exists couple_secret_desires_insert on public.couple_secret_desires;
create policy couple_secret_desires_insert on public.couple_secret_desires for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
drop policy if exists couple_secret_desires_delete on public.couple_secret_desires;
create policy couple_secret_desires_delete on public.couple_secret_desires for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

drop function if exists public.get_my_secret_notes(uuid);
create function public.get_my_secret_notes(target_couple_id uuid)
returns setof public.couple_secret_notes
language sql stable security definer set search_path = public
as $$ select n.* from public.couple_secret_notes n where n.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by n.created_at desc; $$;
grant execute on function public.get_my_secret_notes(uuid) to authenticated;

drop function if exists public.create_secret_note(uuid,text,text);
create function public.create_secret_note(target_couple_id uuid, note_title text, note_body text)
returns public.couple_secret_notes
language plpgsql security definer set search_path = public
as $$
declare new_note public.couple_secret_notes;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if length(trim(coalesce(note_title,'')))=0 or length(trim(coalesce(note_body,'')))=0 then raise exception 'EMPTY_SECRET_NOTE'; end if;
  insert into public.couple_secret_notes(couple_id,created_by,title,body) values(target_couple_id,auth.uid(),left(trim(note_title),80),left(trim(note_body),1000)) returning * into new_note;
  return new_note;
end; $$;
grant execute on function public.create_secret_note(uuid,text,text) to authenticated;

drop function if exists public.delete_secret_note(uuid);
create function public.delete_secret_note(target_note_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.couple_secret_notes where id=target_note_id and created_by=auth.uid();
end; $$;
grant execute on function public.delete_secret_note(uuid) to authenticated;

drop function if exists public.get_my_secret_desires(uuid);
create function public.get_my_secret_desires(target_couple_id uuid)
returns setof public.couple_secret_desires
language sql stable security definer set search_path = public
as $$ select d.* from public.couple_secret_desires d where d.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by d.created_at desc; $$;
grant execute on function public.get_my_secret_desires(uuid) to authenticated;

drop function if exists public.create_secret_desire(uuid,text,integer);
create function public.create_secret_desire(target_couple_id uuid, desire_title text, desire_intensity integer)
returns public.couple_secret_desires
language plpgsql security definer set search_path = public
as $$
declare new_desire public.couple_secret_desires;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if length(trim(coalesce(desire_title,'')))=0 then raise exception 'EMPTY_SECRET_DESIRE'; end if;
  if desire_intensity < 1 or desire_intensity > 10 then raise exception 'INVALID_INTENSITY'; end if;
  insert into public.couple_secret_desires(couple_id,created_by,title,intensity) values(target_couple_id,auth.uid(),left(trim(desire_title),100),desire_intensity) returning * into new_desire;
  return new_desire;
end; $$;
grant execute on function public.create_secret_desire(uuid,text,integer) to authenticated;

drop function if exists public.delete_secret_desire(uuid);
create function public.delete_secret_desire(target_desire_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin delete from public.couple_secret_desires where id=target_desire_id and created_by=auth.uid(); end; $$;
grant execute on function public.delete_secret_desire(uuid) to authenticated;

alter table public.couple_secret_notes replica identity full;
alter table public.couple_secret_desires replica identity full;
do $$ begin alter publication supabase_realtime add table public.couple_secret_notes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.couple_secret_desires; exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';
