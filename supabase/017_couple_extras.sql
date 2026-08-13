-- Usly v43: couple notes, intimacy calendar and gift wishlist.

create table if not exists public.couple_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists couple_notes_idx on public.couple_notes(couple_id,created_at desc);
alter table public.couple_notes enable row level security;
drop policy if exists couple_notes_select on public.couple_notes;
create policy couple_notes_select on public.couple_notes for select using(public.is_couple_member(couple_id));
drop policy if exists couple_notes_insert on public.couple_notes;
create policy couple_notes_insert on public.couple_notes for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
drop policy if exists couple_notes_delete on public.couple_notes;
create policy couple_notes_delete on public.couple_notes for delete using(public.is_couple_member(couple_id) and created_by=auth.uid());

create table if not exists public.couple_intimacy_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  event_type text not null check(event_type in ('sex','oral','orgasm','toys','date','kiss','cuddle','other')),
  created_at timestamptz not null default now(),
  unique(couple_id,date,event_type)
);
create index if not exists couple_intimacy_events_idx on public.couple_intimacy_events(couple_id,date desc);
alter table public.couple_intimacy_events enable row level security;
drop policy if exists intimacy_select on public.couple_intimacy_events;
create policy intimacy_select on public.couple_intimacy_events for select using(public.is_couple_member(couple_id));
drop policy if exists intimacy_insert on public.couple_intimacy_events;
create policy intimacy_insert on public.couple_intimacy_events for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
drop policy if exists intimacy_delete on public.couple_intimacy_events;
create policy intimacy_delete on public.couple_intimacy_events for delete using(public.is_couple_member(couple_id));

create table if not exists public.gift_wishes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 1 and 120),
  url text,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists gift_wishes_idx on public.gift_wishes(couple_id,done,created_at desc);
alter table public.gift_wishes enable row level security;
drop policy if exists gift_wishes_select on public.gift_wishes;
create policy gift_wishes_select on public.gift_wishes for select using(public.is_couple_member(couple_id));
drop policy if exists gift_wishes_insert on public.gift_wishes;
create policy gift_wishes_insert on public.gift_wishes for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
drop policy if exists gift_wishes_update on public.gift_wishes;
create policy gift_wishes_update on public.gift_wishes for update using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));
drop policy if exists gift_wishes_delete on public.gift_wishes;
create policy gift_wishes_delete on public.gift_wishes for delete using(public.is_couple_member(couple_id));

drop function if exists public.get_my_couple_notes(uuid);
create function public.get_my_couple_notes(target_couple_id uuid) returns setof public.couple_notes language sql stable security definer set search_path=public as $$ select n.* from public.couple_notes n where n.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by n.created_at desc; $$;
grant execute on function public.get_my_couple_notes(uuid) to authenticated;
drop function if exists public.create_couple_note(uuid,text);
create function public.create_couple_note(target_couple_id uuid,note_body text) returns public.couple_notes language plpgsql security definer set search_path=public as $$ declare r public.couple_notes; begin if auth.uid() is null or not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; if length(trim(coalesce(note_body,'')))=0 then raise exception 'EMPTY_NOTE'; end if; insert into public.couple_notes(couple_id,created_by,body) values(target_couple_id,auth.uid(),left(trim(note_body),500)) returning * into r; return r; end; $$;
grant execute on function public.create_couple_note(uuid,text) to authenticated;
drop function if exists public.delete_couple_note(uuid);
create function public.delete_couple_note(target_note_id uuid) returns void language sql security definer set search_path=public as $$ delete from public.couple_notes where id=target_note_id and created_by=auth.uid(); $$;
grant execute on function public.delete_couple_note(uuid) to authenticated;

drop function if exists public.get_my_intimacy_events(uuid);
create function public.get_my_intimacy_events(target_couple_id uuid) returns setof public.couple_intimacy_events language sql stable security definer set search_path=public as $$ select e.* from public.couple_intimacy_events e where e.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by e.date desc; $$;
grant execute on function public.get_my_intimacy_events(uuid) to authenticated;
drop function if exists public.toggle_intimacy_event(uuid,date,text);
create function public.toggle_intimacy_event(target_couple_id uuid,input_date date,input_type text) returns boolean language plpgsql security definer set search_path=public as $$ declare existed boolean; begin if auth.uid() is null or not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; if input_type not in ('sex','oral','orgasm','toys','date','kiss','cuddle','other') then raise exception 'INVALID_TYPE'; end if; select exists(select 1 from public.couple_intimacy_events where couple_id=target_couple_id and date=input_date and event_type=input_type) into existed; if existed then delete from public.couple_intimacy_events where couple_id=target_couple_id and date=input_date and event_type=input_type; return false; else insert into public.couple_intimacy_events(couple_id,created_by,date,event_type) values(target_couple_id,auth.uid(),input_date,input_type); return true; end if; end; $$;
grant execute on function public.toggle_intimacy_event(uuid,date,text) to authenticated;

drop function if exists public.get_my_gift_wishes(uuid);
create function public.get_my_gift_wishes(target_couple_id uuid) returns setof public.gift_wishes language sql stable security definer set search_path=public as $$ select w.* from public.gift_wishes w where w.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by w.done asc,w.created_at desc; $$;
grant execute on function public.get_my_gift_wishes(uuid) to authenticated;
drop function if exists public.create_gift_wish(uuid,text,text,text);
create function public.create_gift_wish(target_couple_id uuid,wish_title text,wish_url text default null,wish_note text default null) returns public.gift_wishes language plpgsql security definer set search_path=public as $$ declare r public.gift_wishes; begin if auth.uid() is null or not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; if length(trim(coalesce(wish_title,'')))=0 then raise exception 'EMPTY_WISH'; end if; insert into public.gift_wishes(couple_id,created_by,title,url,note) values(target_couple_id,auth.uid(),left(trim(wish_title),120),nullif(left(trim(coalesce(wish_url,'')),1000),''),nullif(left(trim(coalesce(wish_note,'')),300),'')) returning * into r; return r; end; $$;
grant execute on function public.create_gift_wish(uuid,text,text,text) to authenticated;
drop function if exists public.toggle_gift_wish(uuid);
create function public.toggle_gift_wish(target_wish_id uuid) returns void language sql security definer set search_path=public as $$ update public.gift_wishes set done=not done where id=target_wish_id and public.is_couple_member(couple_id); $$;
grant execute on function public.toggle_gift_wish(uuid) to authenticated;
drop function if exists public.delete_gift_wish(uuid);
create function public.delete_gift_wish(target_wish_id uuid) returns void language sql security definer set search_path=public as $$ delete from public.gift_wishes where id=target_wish_id and created_by=auth.uid(); $$;
grant execute on function public.delete_gift_wish(uuid) to authenticated;

alter table public.couple_notes replica identity full;
alter table public.couple_intimacy_events replica identity full;
alter table public.gift_wishes replica identity full;
do $$ begin alter publication supabase_realtime add table public.couple_notes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.couple_intimacy_events; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.gift_wishes; exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
