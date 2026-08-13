-- Usly Phase 3: feelings
-- Run this once in Supabase SQL Editor after 002_couples_phase2.sql.

create extension if not exists pgcrypto;

create table if not exists public.couple_feelings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('love', 'happy', 'calm', 'sad', 'angry', 'miss')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists couple_feelings_couple_created_idx
  on public.couple_feelings(couple_id, created_at desc);

alter table public.couple_feelings enable row level security;

drop policy if exists "feelings_select_for_members" on public.couple_feelings;
create policy "feelings_select_for_members"
on public.couple_feelings
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "feelings_insert_own_member" on public.couple_feelings;
create policy "feelings_insert_own_member"
on public.couple_feelings
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "feelings_update_own" on public.couple_feelings;
create policy "feelings_update_own"
on public.couple_feelings
for update
to authenticated
using (user_id = auth.uid() and public.is_couple_member(couple_id))
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "feelings_delete_own" on public.couple_feelings;
create policy "feelings_delete_own"
on public.couple_feelings
for delete
to authenticated
using (user_id = auth.uid() and public.is_couple_member(couple_id));

grant select, insert, update, delete on public.couple_feelings to authenticated;
