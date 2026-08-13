-- Usly: psychologically-informed relationship check-in / "Room of Truth".
-- Shared only inside the couple. This is relationship education, not therapy.

create table if not exists public.couple_truth_topics (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  category text not null check(category in ('concern','change','add','appreciation','important')),
  title text not null check(char_length(trim(title)) between 1 and 100),
  body text not null check(char_length(trim(body)) between 1 and 1200),
  feeling text,
  request text,
  status text not null default 'open' check(status in ('open','discussing','agreed','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists couple_truth_topics_idx on public.couple_truth_topics(couple_id,updated_at desc);
alter table public.couple_truth_topics enable row level security;
drop policy if exists couple_truth_topics_select on public.couple_truth_topics;
create policy couple_truth_topics_select on public.couple_truth_topics for select using(public.is_couple_member(couple_id));
drop policy if exists couple_truth_topics_insert on public.couple_truth_topics;
create policy couple_truth_topics_insert on public.couple_truth_topics for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
drop policy if exists couple_truth_topics_update on public.couple_truth_topics;
create policy couple_truth_topics_update on public.couple_truth_topics for update using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));

create table if not exists public.couple_truth_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.couple_truth_topics(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(trim(body)) between 1 and 1200),
  created_at timestamptz not null default now()
);
create index if not exists couple_truth_replies_idx on public.couple_truth_replies(topic_id,created_at asc);
alter table public.couple_truth_replies enable row level security;
drop policy if exists couple_truth_replies_select on public.couple_truth_replies;
create policy couple_truth_replies_select on public.couple_truth_replies for select using(public.is_couple_member(couple_id));
drop policy if exists couple_truth_replies_insert on public.couple_truth_replies;
create policy couple_truth_replies_insert on public.couple_truth_replies for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());

create or replace function public.touch_truth_topic_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists touch_truth_topic_updated_at on public.couple_truth_topics;
create trigger touch_truth_topic_updated_at before update on public.couple_truth_topics for each row execute function public.touch_truth_topic_updated_at();

drop function if exists public.get_my_truth_topics(uuid);
create function public.get_my_truth_topics(target_couple_id uuid)
returns setof public.couple_truth_topics language sql stable security definer set search_path=public
as $$ select t.* from public.couple_truth_topics t where t.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by t.updated_at desc; $$;
grant execute on function public.get_my_truth_topics(uuid) to authenticated;

drop function if exists public.get_my_truth_replies(uuid);
create function public.get_my_truth_replies(target_couple_id uuid)
returns setof public.couple_truth_replies language sql stable security definer set search_path=public
as $$ select r.* from public.couple_truth_replies r where r.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by r.created_at asc; $$;
grant execute on function public.get_my_truth_replies(uuid) to authenticated;

drop function if exists public.create_truth_topic(uuid,text,text,text,text,text);
create function public.create_truth_topic(target_couple_id uuid,input_category text,input_title text,input_body text,input_feeling text default null,input_request text default null)
returns public.couple_truth_topics language plpgsql security definer set search_path=public as $$
declare r public.couple_truth_topics;
begin
  if auth.uid() is null or not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if input_category not in ('concern','change','add','appreciation','important') then raise exception 'INVALID_CATEGORY'; end if;
  if length(trim(coalesce(input_title,'')))=0 or length(trim(coalesce(input_body,'')))=0 then raise exception 'EMPTY_TOPIC'; end if;
  insert into public.couple_truth_topics(couple_id,created_by,category,title,body,feeling,request)
  values(target_couple_id,auth.uid(),input_category,left(trim(input_title),100),left(trim(input_body),1200),nullif(left(trim(coalesce(input_feeling,'')),300),''),nullif(left(trim(coalesce(input_request,'')),500),'')) returning * into r;
  return r;
end; $$;
grant execute on function public.create_truth_topic(uuid,text,text,text,text,text) to authenticated;

drop function if exists public.create_truth_reply(uuid,text);
create function public.create_truth_reply(target_topic_id uuid,reply_body text)
returns public.couple_truth_replies language plpgsql security definer set search_path=public as $$
declare topic public.couple_truth_topics; r public.couple_truth_replies;
begin
  select * into topic from public.couple_truth_topics where id=target_topic_id;
  if topic.id is null or auth.uid() is null or not public.is_couple_member(topic.couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if length(trim(coalesce(reply_body,'')))=0 then raise exception 'EMPTY_REPLY'; end if;
  insert into public.couple_truth_replies(topic_id,couple_id,created_by,body) values(topic.id,topic.couple_id,auth.uid(),left(trim(reply_body),1200)) returning * into r;
  update public.couple_truth_topics set status=case when status='open' then 'discussing' else status end where id=topic.id;
  return r;
end; $$;
grant execute on function public.create_truth_reply(uuid,text) to authenticated;

drop function if exists public.update_truth_topic_status(uuid,text);
create function public.update_truth_topic_status(target_topic_id uuid,new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare c uuid;
begin
  select couple_id into c from public.couple_truth_topics where id=target_topic_id;
  if c is null or not public.is_couple_member(c) then raise exception 'NOT_COUPLE_MEMBER'; end if;
  if new_status not in ('open','discussing','agreed','done') then raise exception 'INVALID_STATUS'; end if;
  update public.couple_truth_topics set status=new_status where id=target_topic_id;
end; $$;
grant execute on function public.update_truth_topic_status(uuid,text) to authenticated;

alter table public.couple_truth_topics replica identity full;
alter table public.couple_truth_replies replica identity full;
do $$ begin alter publication supabase_realtime add table public.couple_truth_topics; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.couple_truth_replies; exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
