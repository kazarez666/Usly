-- Usly phase 10: safely leave a couple
-- Run once in Supabase SQL Editor.

create or replace function public.leave_couple(target_couple_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.couple_members
    where couple_id = target_couple_id and user_id = auth.uid()
  ) then
    raise exception 'NOT_COUPLE_MEMBER';
  end if;

  delete from public.couple_members
  where couple_id = target_couple_id and user_id = auth.uid();

  select count(*) into remaining
  from public.couple_members
  where couple_id = target_couple_id;

  if remaining = 0 then
    delete from public.couples where id = target_couple_id;
  end if;

  return true;
end;
$$;

grant execute on function public.leave_couple(uuid) to authenticated;
