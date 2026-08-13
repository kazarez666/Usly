create table if not exists public.couple_desires (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 desire text not null,
 intensity integer not null check (intensity between 1 and 10),
 updated_at timestamptz not null default now(),
 unique(couple_id,user_id)
);
alter table public.couple_desires enable row level security;
drop policy if exists couple_desires_select on public.couple_desires;
create policy couple_desires_select on public.couple_desires for select using (
 exists(select 1 from public.couple_members cm where cm.couple_id=couple_desires.couple_id and cm.user_id=auth.uid())
);
drop policy if exists couple_desires_insert on public.couple_desires;
create policy couple_desires_insert on public.couple_desires for insert with check (
 user_id=auth.uid() and exists(select 1 from public.couple_members cm where cm.couple_id=couple_desires.couple_id and cm.user_id=auth.uid())
);
drop policy if exists couple_desires_update on public.couple_desires;
create policy couple_desires_update on public.couple_desires for update using(user_id=auth.uid()) with check(user_id=auth.uid());
