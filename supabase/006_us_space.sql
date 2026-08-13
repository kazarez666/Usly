-- Usly phase 6: the "Us" space
-- Run once in Supabase SQL Editor.
-- Safe migration: older Usly databases may not have these columns yet.

alter table public.couples
  add column if not exists name text not null default 'Наше пространство';

alter table public.couples
  add column if not exists relationship_started_at date;

create or replace function public.get_my_us(target_couple_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_me boolean,
  couple_name text,
  relationship_started_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.user_id,
    coalesce(p.display_name, '') as display_name,
    p.avatar_url,
    cm.joined_at,
    (cm.user_id = auth.uid()) as is_me,
    c.name as couple_name,
    c.relationship_started_at
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  left join public.profiles p on p.id = cm.user_id
  where cm.couple_id = target_couple_id
    and public.is_couple_member(target_couple_id)
  order by cm.joined_at asc;
$$;

grant execute on function public.get_my_us(uuid) to authenticated;

drop function if exists public.update_my_profile(text);
create function public.update_my_profile(new_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if length(trim(coalesce(new_display_name, ''))) = 0 then
    raise exception 'EMPTY_NAME';
  end if;

  update public.profiles
  set display_name = left(trim(new_display_name), 40),
      updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.update_my_profile(text) to authenticated;

drop function if exists public.update_my_us(uuid, text, date);
create function public.update_my_us(target_couple_id uuid, new_couple_name text, new_started_at date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_couple_member(target_couple_id) then
    raise exception 'NOT_COUPLE_MEMBER';
  end if;

  if length(trim(coalesce(new_couple_name, ''))) = 0 then
    raise exception 'EMPTY_COUPLE_NAME';
  end if;

  update public.couples
  set name = left(trim(new_couple_name), 60),
      relationship_started_at = new_started_at
  where id = target_couple_id;
end;
$$;

grant execute on function public.update_my_us(uuid, text, date) to authenticated;
