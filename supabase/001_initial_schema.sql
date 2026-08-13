-- Usly initial schema
-- Run this once in Supabase SQL Editor after creating a fresh project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Us',
  relationship_started_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create or replace function public.is_couple_member(target_couple uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.couple_members cm
    where cm.couple_id = target_couple and cm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members can view their couple" on public.couples;
create policy "members can view their couple" on public.couples for select using (public.is_couple_member(id));

drop policy if exists "members can view membership" on public.couple_members;
create policy "members can view membership" on public.couple_members for select using (user_id = auth.uid() or public.is_couple_member(couple_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
