-- Usly Phase 2: real couple + invite system
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- This migration does not require a profiles table.

create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (couple_id, user_id),
  unique (user_id)
);

create index if not exists couple_members_couple_id_idx
  on public.couple_members(couple_id);

create index if not exists couple_members_user_id_idx
  on public.couple_members(user_id);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- Members can see their own couple and the other member of that same couple.
drop policy if exists "couples_select_for_members" on public.couples;
create policy "couples_select_for_members"
on public.couples
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "couple_members_select_same_couple" on public.couple_members;
create policy "couple_members_select_same_couple"
on public.couple_members
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members mine
    where mine.couple_id = couple_members.couple_id
      and mine.user_id = auth.uid()
  )
);

-- RPCs run with elevated privileges but only accept the current authenticated user.
-- They enforce one couple per user and a hard maximum of two members.

create or replace function public.create_couple()
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'USER_ALREADY_IN_COUPLE';
  end if;

  loop
    new_code := upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1 from public.couples where couples.invite_code = new_code
    );
  end loop;

  insert into public.couples (invite_code)
  values (new_code)
  returning id into new_couple_id;

  insert into public.couple_members (couple_id, user_id)
  values (new_couple_id, auth.uid());

  return query select new_couple_id, new_code;
end;
$$;

create or replace function public.join_couple(p_invite_code text)
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_code text;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'USER_ALREADY_IN_COUPLE';
  end if;

  select c.id, c.invite_code
    into target_id, target_code
  from public.couples c
  where c.invite_code = upper(trim(p_invite_code))
  limit 1;

  if target_id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  select count(*) into member_count
  from public.couple_members
  where couple_id = target_id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target_id, auth.uid());

  return query select target_id, target_code;
end;
$$;

revoke all on function public.create_couple() from public;
grant execute on function public.create_couple() to authenticated;

revoke all on function public.join_couple(text) from public;
grant execute on function public.join_couple(text) to authenticated;

-- The invite code itself is intentionally not readable by arbitrary users.
-- Joining happens only through join_couple().
