-- Fix room password hashing on Supabase projects where pgcrypto functions are not reachable from `public` search_path.
-- The previous migration called gen_salt()/crypt() through search_path=public, which can produce:
--   function gen_salt(unknown, integer) does not exist
-- Keep the same RPC API; only put the pgcrypto schema first in the RPC search path.

create extension if not exists pgcrypto;

create or replace function public.set_room_password(target_couple_id uuid, target_room text, new_password text)
returns void language plpgsql security definer set search_path=extensions,public as $$
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

create or replace function public.verify_room_password(target_couple_id uuid, target_room text, candidate_password text)
returns boolean language plpgsql security definer set search_path=extensions,public as $$
declare stored_hash text;
begin
  if auth.uid() is null or not public.is_couple_member(target_couple_id) then return false; end if;
  select password_hash into stored_hash from public.couple_room_passwords where couple_id=target_couple_id and room=target_room limit 1;
  if stored_hash is null then return false; end if;
  return crypt(coalesce(candidate_password,''), stored_hash)=stored_hash;
end;
$$;
grant execute on function public.verify_room_password(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
