create extension if not exists pgcrypto;

create table if not exists public.couple_room_passwords (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  room text not null check (room in ('secret','truth')),
  password_hash text not null,
  updated_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique(couple_id, room)
);

alter table public.couple_room_passwords enable row level security;
revoke all on public.couple_room_passwords from anon, authenticated;

drop function if exists public.room_password_exists(uuid,text);
create function public.room_password_exists(target_couple_id uuid, target_room text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_couple_member(target_couple_id)
    and exists(select 1 from public.couple_room_passwords where couple_id=target_couple_id and room=target_room);
$$;
grant execute on function public.room_password_exists(uuid,text) to authenticated;

drop function if exists public.set_room_password(uuid,text,text);
create function public.set_room_password(target_couple_id uuid, target_room text, new_password text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if target_room not in ('secret','truth') then raise exception 'INVALID_ROOM'; end if;
  if length(trim(coalesce(new_password,''))) < 4 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  insert into public.couple_room_passwords(couple_id,room,password_hash,updated_by,updated_at)
  values(target_couple_id,target_room,crypt(trim(new_password),gen_salt('bf',10)),auth.uid(),now())
  on conflict(couple_id,room) do update set password_hash=excluded.password_hash,updated_by=excluded.updated_by,updated_at=now();
end;
$$;
grant execute on function public.set_room_password(uuid,text,text) to authenticated;

drop function if exists public.verify_room_password(uuid,text,text);
create function public.verify_room_password(target_couple_id uuid, target_room text, candidate_password text)
returns boolean language plpgsql security definer set search_path=public as $$
declare stored_hash text;
begin
  if auth.uid() is null or not public.is_couple_member(target_couple_id) then return false; end if;
  select password_hash into stored_hash from public.couple_room_passwords where couple_id=target_couple_id and room=target_room limit 1;
  if stored_hash is null then return false; end if;
  return crypt(coalesce(candidate_password,''), stored_hash)=stored_hash;
end;
$$;
grant execute on function public.verify_room_password(uuid,text,text) to authenticated;

-- Secret desires become a proper shared wish lifecycle.
alter table public.secret_sent_desires drop constraint if exists secret_sent_desires_status_check;
alter table public.secret_sent_desires add constraint secret_sent_desires_status_check check (status in ('pending','accepted','declined','completed'));

drop function if exists public.update_secret_desire_status(uuid,text);
create function public.update_secret_desire_status(target_desire_id uuid,new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare d public.secret_sent_desires;
begin
  if new_status not in ('accepted','declined','completed') then raise exception 'INVALID_STATUS'; end if;
  select * into d from public.secret_sent_desires where id=target_desire_id;
  if d.id is null or not public.is_couple_member(d.couple_id) then raise exception 'NOT_ALLOWED'; end if;
  if new_status='completed' then
    if d.status <> 'accepted' then raise exception 'DESIRE_NOT_ACCEPTED'; end if;
    update public.secret_sent_desires set status='completed' where id=target_desire_id;
  else
    if d.to_user <> auth.uid() then raise exception 'NOT_ALLOWED'; end if;
    update public.secret_sent_desires set status=new_status where id=target_desire_id;
  end if;
end;
$$;
grant execute on function public.update_secret_desire_status(uuid,text) to authenticated;

notify pgrst,'reload schema';
