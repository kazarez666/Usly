-- Usly: shared wishes
-- One shared list for a couple. No private/public leakage across couples.

create table if not exists public.couple_wishes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  joined_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists couple_wishes_couple_created_idx
  on public.couple_wishes(couple_id, created_at desc);

alter table public.couple_wishes enable row level security;

drop policy if exists "couple_wishes_select_members" on public.couple_wishes;
create policy "couple_wishes_select_members"
on public.couple_wishes for select
using (public.is_couple_member(couple_id));

drop policy if exists "couple_wishes_insert_members" on public.couple_wishes;
create policy "couple_wishes_insert_members"
on public.couple_wishes for insert
with check (public.is_couple_member(couple_id) and created_by = auth.uid());

drop policy if exists "couple_wishes_update_members" on public.couple_wishes;
create policy "couple_wishes_update_members"
on public.couple_wishes for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create or replace function public.get_my_wishes(target_couple_id uuid)
returns setof public.couple_wishes
language sql stable security definer set search_path = public
as $$
  select w.*
  from public.couple_wishes w
  where w.couple_id = target_couple_id
    and public.is_couple_member(target_couple_id)
  order by w.status asc, w.created_at desc;
$$;

grant execute on function public.get_my_wishes(uuid) to authenticated;

drop function if exists public.create_wish(uuid, text, text);
create function public.create_wish(target_couple_id uuid, wish_title text, wish_note text default null)
returns public.couple_wishes
language plpgsql security definer set search_path = public
as $$
declare new_wish public.couple_wishes;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if length(trim(coalesce(wish_title, ''))) = 0 then raise exception 'EMPTY_WISH'; end if;

  insert into public.couple_wishes(couple_id, created_by, title, note)
  values (target_couple_id, auth.uid(), left(trim(wish_title), 100), nullif(left(trim(coalesce(wish_note, '')), 300), ''))
  returning * into new_wish;
  return new_wish;
end;
$$;

grant execute on function public.create_wish(uuid, text, text) to authenticated;

drop function if exists public.join_wish(uuid);
create function public.join_wish(target_wish_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare wish_row public.couple_wishes;
begin
  select * into wish_row from public.couple_wishes where id = target_wish_id;
  if wish_row.id is null then raise exception 'WISH_NOT_FOUND'; end if;
  if not public.is_couple_member(wish_row.couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if wish_row.status <> 'open' then raise exception 'WISH_DONE'; end if;
  if wish_row.created_by = auth.uid() then raise exception 'ALREADY_YOURS'; end if;
  update public.couple_wishes set joined_by = auth.uid() where id = target_wish_id;
end;
$$;

grant execute on function public.join_wish(uuid) to authenticated;

drop function if exists public.complete_wish(uuid);
create function public.complete_wish(target_wish_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare wish_row public.couple_wishes;
begin
  select * into wish_row from public.couple_wishes where id = target_wish_id;
  if wish_row.id is null then raise exception 'WISH_NOT_FOUND'; end if;
  if not public.is_couple_member(wish_row.couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if wish_row.status = 'done' then return; end if;
  if wish_row.joined_by is null then raise exception 'NEED_TWO'; end if;
  update public.couple_wishes set status = 'done', completed_at = now() where id = target_wish_id;
end;
$$;

grant execute on function public.complete_wish(uuid) to authenticated;

-- Realtime for both phones.
alter table public.couple_wishes replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.couple_wishes;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
