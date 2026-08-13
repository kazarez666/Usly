-- Usly: private realtime chat for two people.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_couple_created_idx
  on public.messages(couple_id, created_at asc);

create index if not exists messages_unread_idx
  on public.messages(couple_id, sender_id, read_at)
  where read_at is null;

alter table public.messages enable row level security;

drop policy if exists "messages_select_for_members" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;

create policy "messages_select_for_members"
on public.messages for select to authenticated
using (public.is_couple_member(couple_id));

create policy "messages_insert_own"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_couple_member(couple_id)
);

create policy "messages_delete_own"
on public.messages for delete to authenticated
using (
  sender_id = auth.uid()
  and public.is_couple_member(couple_id)
);


create or replace function public.mark_messages_read(p_couple_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_couple_member(p_couple_id) then
    raise exception 'NOT_COUPLE_MEMBER';
  end if;

  update public.messages
  set read_at = coalesce(read_at, now())
  where couple_id = p_couple_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

grant execute on function public.mark_messages_read(uuid) to authenticated;

grant select, insert, delete on public.messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

alter table public.messages replica identity full;
notify pgrst, 'reload schema';
