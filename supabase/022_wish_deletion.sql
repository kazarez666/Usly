-- v56: delete wishes from any lifecycle tab.
drop function if exists public.delete_wish(uuid);
create function public.delete_wish(target_wish_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare w public.couple_wishes;
begin
 select * into w from public.couple_wishes where id=target_wish_id;
 if w.id is null then raise exception 'WISH_NOT_FOUND'; end if;
 if not public.is_couple_member(w.couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
 delete from public.couple_wishes where id=target_wish_id;
end; $$;
grant execute on function public.delete_wish(uuid) to authenticated;

drop function if exists public.delete_secret_desire(uuid);
create function public.delete_secret_desire(target_desire_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare d public.secret_sent_desires;
begin
 select * into d from public.secret_sent_desires where id=target_desire_id;
 if d.id is null then raise exception 'DESIRE_NOT_FOUND'; end if;
 if not public.is_couple_member(d.couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
 delete from public.secret_sent_desires where id=target_desire_id;
end; $$;
grant execute on function public.delete_secret_desire(uuid) to authenticated;

notify pgrst,'reload schema';
