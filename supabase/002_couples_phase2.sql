-- Usly Phase 2: couple + invite system
-- Run this ONCE in Supabase SQL Editor.
-- Safe for the current Usly starter schema: it migrates the existing
-- couples/couple_members tables instead of assuming a blank database.

create extension if not exists pgcrypto;

-- Existing starter schema already has these tables. Add only the fields
-- required by the new couple flow.
alter table public.couples
  add column if not exists invite_code text;

alter table public.couple_members
  add column if not exists id uuid;

update public.couple_members
set id = gen_random_uuid()
where id is null;

alter table public.couple_members
  alter column id set default gen_random_uuid();

alter table public.couple_members
  alter column id set not null;

-- Give old couples an invite code before making it unique.
update public.couples
set invite_code = upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
where invite_code is null or btrim(invite_code) = '';

alter table public.couples
  alter column invite_code set not null;

create unique index if not exists couples_invite_code_uidx
  on public.couples(invite_code);

create unique index if not exists couple_members_id_uidx
  on public.couple_members(id);

-- One user can belong to only one couple.
create unique index if not exists couple_members_user_uidx
  on public.couple_members(user_id);

-- Helper used by RLS. SECURITY DEFINER prevents recursive policy checks.
create or replace function public.is_couple_member(target_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple
      and cm.user_id = auth.uid()
  );
$$;

alter function public.is_couple_member(uuid) owner to postgres;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- Replace the old starter policies with policies that allow members to see
-- their own couple and its membership, but nothing belonging to another couple.
drop policy if exists "members can view their couple" on public.couples;
drop policy if exists "couples_select_for_members" on public.couples;
create policy "couples_select_for_members"
on public.couples
for select
to authenticated
using (public.is_couple_member(id));

drop policy if exists "members can view membership" on public.couple_members;
drop policy if exists "couple_members_select_same_couple" on public.couple_members;
create policy "couple_members_select_same_couple"
on public.couple_members
for select
to authenticated
using (public.is_couple_member(couple_id));

-- Create a couple for the currently authenticated user.
create or replace function public.create_couple()
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
  new_code text;
  attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'USER_ALREADY_IN_COUPLE';
  end if;

  loop
    attempts := attempts + 1;
    new_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into public.couples (name, invite_code)
      values ('Our Us', new_code)
      returning id into new_couple_id;
      exit;
    exception when unique_violation then
      if attempts >= 10 then
        raise exception 'INVITE_CODE_GENERATION_FAILED';
      end if;
    end;
  end loop;

  insert into public.couple_members (couple_id, user_id)
  values (new_couple_id, auth.uid());

  return query select new_couple_id, new_code;
end;
$$;

-- Join an existing couple by invite code. A couple can never have more than 2 members.
create or replace function public.join_couple(p_invite_code text)
returns table (couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple_id uuid;
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
    into target_couple_id, target_code
  from public.couples c
  where upper(c.invite_code) = upper(trim(p_invite_code))
  limit 1;

  if target_couple_id is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;

  select count(*)::integer
    into member_count
  from public.couple_members cm
  where cm.couple_id = target_couple_id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target_couple_id, auth.uid());

  return query select target_couple_id, target_code;
end;
$$;

revoke all on function public.create_couple() from public;
revoke all on function public.join_couple(text) from public;
grant execute on function public.create_couple() to authenticated;
grant execute on function public.join_couple(text) to authenticated;
