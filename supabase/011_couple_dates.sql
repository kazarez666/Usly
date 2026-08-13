-- Usly: shared important dates
create table if not exists public.couple_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 60),
  date date not null,
  kind text not null default 'other' check (kind in ('anniversary','birthday','other')),
  created_at timestamptz not null default now()
);

create index if not exists couple_dates_couple_date_idx on public.couple_dates(couple_id, date);

alter table public.couple_dates enable row level security;

drop policy if exists "couple_dates_select_members" on public.couple_dates;
create policy "couple_dates_select_members" on public.couple_dates
  for select to authenticated using (public.is_couple_member(couple_id));

drop policy if exists "couple_dates_insert_members" on public.couple_dates;
create policy "couple_dates_insert_members" on public.couple_dates
  for insert to authenticated with check (created_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "couple_dates_delete_members" on public.couple_dates;
create policy "couple_dates_delete_members" on public.couple_dates
  for delete to authenticated using (public.is_couple_member(couple_id));

drop function if exists public.create_couple_date(uuid, text, date, text);
create function public.create_couple_date(target_couple_id uuid, input_title text, input_date date, input_kind text)
returns public.couple_dates
language plpgsql security definer set search_path = public
as $$
declare result public.couple_dates;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if length(trim(coalesce(input_title,''))) = 0 then raise exception 'EMPTY_TITLE'; end if;
  if input_kind not in ('anniversary','birthday','other') then raise exception 'INVALID_KIND'; end if;
  insert into public.couple_dates(couple_id, created_by, title, date, kind)
  values (target_couple_id, auth.uid(), left(trim(input_title),60), input_date, input_kind)
  returning * into result;
  return result;
end;
$$;

grant execute on function public.create_couple_date(uuid,text,date,text) to authenticated;

drop function if exists public.delete_couple_date(uuid);
create function public.delete_couple_date(target_date_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare target_couple uuid;
begin
  select couple_id into target_couple from public.couple_dates where id = target_date_id;
  if target_couple is null then raise exception 'DATE_NOT_FOUND'; end if;
  if not public.is_couple_member(target_couple) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  delete from public.couple_dates where id = target_date_id;
end;
$$;

grant execute on function public.delete_couple_date(uuid) to authenticated;
