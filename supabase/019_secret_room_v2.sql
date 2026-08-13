-- Usly v52: private 18+ room v2: photos, private chat, configurable desires.

create table if not exists public.secret_categories (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 1 and 40), icon text not null default '✦', sort_order integer not null default 0,
  is_default boolean not null default false, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create unique index if not exists secret_categories_name_idx on public.secret_categories(couple_id, lower(name));
alter table public.secret_categories enable row level security;
create policy secret_categories_select on public.secret_categories for select using(public.is_couple_member(couple_id));
create policy secret_categories_insert on public.secret_categories for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
create policy secret_categories_update on public.secret_categories for update using(public.is_couple_member(couple_id));
create policy secret_categories_delete on public.secret_categories for delete using(public.is_couple_member(couple_id) and created_by=auth.uid() and not is_default);

create table if not exists public.secret_options (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  category_id uuid not null references public.secret_categories(id) on delete cascade, title text not null check(char_length(trim(title)) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create index if not exists secret_options_idx on public.secret_options(couple_id,category_id,created_at desc);
alter table public.secret_options enable row level security;
create policy secret_options_select on public.secret_options for select using(public.is_couple_member(couple_id));
create policy secret_options_insert on public.secret_options for insert with check(public.is_couple_member(couple_id) and created_by=auth.uid());
create policy secret_options_delete on public.secret_options for delete using(public.is_couple_member(couple_id) and created_by=auth.uid());

create table if not exists public.secret_sent_desires (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  option_id uuid not null references public.secret_options(id) on delete cascade, from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade, note text default '', status text not null default 'pending' check(status in ('pending','accepted','declined')), created_at timestamptz not null default now()
);
create index if not exists secret_sent_desires_idx on public.secret_sent_desires(couple_id,created_at desc);
alter table public.secret_sent_desires enable row level security;
create policy secret_sent_desires_select on public.secret_sent_desires for select using(public.is_couple_member(couple_id));
create policy secret_sent_desires_insert on public.secret_sent_desires for insert with check(public.is_couple_member(couple_id) and from_user=auth.uid() and to_user<>auth.uid());
create policy secret_sent_desires_update on public.secret_sent_desires for update using(public.is_couple_member(couple_id) and to_user=auth.uid());

create table if not exists public.secret_photos (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade, path text not null, caption text default '', created_at timestamptz not null default now()
);
create index if not exists secret_photos_idx on public.secret_photos(couple_id,created_at desc);
alter table public.secret_photos enable row level security;
create policy secret_photos_select on public.secret_photos for select using(public.is_couple_member(couple_id));
create policy secret_photos_insert on public.secret_photos for insert with check(public.is_couple_member(couple_id) and uploaded_by=auth.uid());
create policy secret_photos_delete on public.secret_photos for delete using(public.is_couple_member(couple_id) and uploaded_by=auth.uid());

create table if not exists public.secret_chat_messages (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade, body text not null check(char_length(trim(body)) between 1 and 2000), created_at timestamptz not null default now()
);
create index if not exists secret_chat_idx on public.secret_chat_messages(couple_id,created_at asc);
alter table public.secret_chat_messages enable row level security;
create policy secret_chat_select on public.secret_chat_messages for select using(public.is_couple_member(couple_id));
create policy secret_chat_insert on public.secret_chat_messages for insert with check(public.is_couple_member(couple_id) and sender_id=auth.uid());
create policy secret_chat_delete on public.secret_chat_messages for delete using(public.is_couple_member(couple_id) and sender_id=auth.uid());

insert into public.secret_categories(couple_id,name,icon,sort_order,is_default,created_by)
select c.id,v.name,v.icon,v.sort_order,true,null
from public.couples c cross join (values ('Позы','◈',1),('Места','⌂',2),('Настроение','☾',3),('Игры','✦',4),('Ласки','♡',5)) v(name,icon,sort_order)
where not exists(select 1 from public.secret_categories sc where sc.couple_id=c.id);

insert into storage.buckets(id,name,public) values('secret-media','secret-media',false) on conflict(id) do update set public=false;

create policy secret_media_select on storage.objects for select using(bucket_id='secret-media' and public.is_couple_member((storage.foldername(name))[1]::uuid));
create policy secret_media_insert on storage.objects for insert with check(bucket_id='secret-media' and public.is_couple_member((storage.foldername(name))[1]::uuid) and (storage.foldername(name))[2]=auth.uid()::text);
create policy secret_media_delete on storage.objects for delete using(bucket_id='secret-media' and (storage.foldername(name))[2]=auth.uid()::text);

create or replace function public.get_secret_categories(target_couple_id uuid) returns setof public.secret_categories language sql stable security definer set search_path=public as $$ select * from public.secret_categories where couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by sort_order,name $$;
grant execute on function public.get_secret_categories(uuid) to authenticated;
create or replace function public.create_secret_category(target_couple_id uuid,category_name text,category_icon text default '✦') returns public.secret_categories language plpgsql security definer set search_path=public as $$ declare r public.secret_categories; begin if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; insert into public.secret_categories(couple_id,name,icon,sort_order,is_default,created_by) values(target_couple_id,left(trim(category_name),40),left(category_icon,4),coalesce((select max(sort_order)+1 from public.secret_categories where couple_id=target_couple_id),1),false,auth.uid()) returning * into r; return r; end $$;
grant execute on function public.create_secret_category(uuid,text,text) to authenticated;
create or replace function public.update_secret_category(target_category_id uuid,category_name text,category_icon text default '✦') returns void language plpgsql security definer set search_path=public as $$ begin update public.secret_categories set name=left(trim(category_name),40),icon=left(category_icon,4) where id=target_category_id and public.is_couple_member(couple_id); end $$;
grant execute on function public.update_secret_category(uuid,text,text) to authenticated;
create or replace function public.delete_secret_category(target_category_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin delete from public.secret_categories where id=target_category_id and public.is_couple_member(couple_id) and created_by=auth.uid() and not is_default; end $$;
grant execute on function public.delete_secret_category(uuid) to authenticated;

create or replace function public.get_secret_options(target_couple_id uuid,target_category_id uuid default null) returns table(id uuid,couple_id uuid,category_id uuid,title text,created_by uuid,created_at timestamptz) language sql stable security definer set search_path=public as $$ select o.id,o.couple_id,o.category_id,o.title,o.created_by,o.created_at from public.secret_options o where o.couple_id=target_couple_id and public.is_couple_member(target_couple_id) and (target_category_id is null or o.category_id=target_category_id) order by o.created_at desc $$;
grant execute on function public.get_secret_options(uuid,uuid) to authenticated;
create or replace function public.create_secret_option(target_couple_id uuid,target_category_id uuid,option_title text) returns public.secret_options language plpgsql security definer set search_path=public as $$ declare r public.secret_options; begin if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; if not exists(select 1 from public.secret_categories where id=target_category_id and couple_id=target_couple_id) then raise exception 'INVALID_CATEGORY'; end if; insert into public.secret_options(couple_id,category_id,title,created_by) values(target_couple_id,target_category_id,left(trim(option_title),100),auth.uid()) returning * into r; return r; end $$;
grant execute on function public.create_secret_option(uuid,uuid,text) to authenticated;
create or replace function public.delete_secret_option(target_option_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin delete from public.secret_options where id=target_option_id and created_by=auth.uid() and public.is_couple_member(couple_id); end $$;
grant execute on function public.delete_secret_option(uuid) to authenticated;

create or replace function public.send_secret_desire(target_couple_id uuid,target_option_id uuid,desire_note text default '') returns public.secret_sent_desires language plpgsql security definer set search_path=public as $$ declare partner uuid; r public.secret_sent_desires; begin if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; select user_id into partner from public.couple_members where couple_id=target_couple_id and user_id<>auth.uid() limit 1; if partner is null then raise exception 'PARTNER_NOT_FOUND'; end if; if not exists(select 1 from public.secret_options where id=target_option_id and couple_id=target_couple_id) then raise exception 'INVALID_OPTION'; end if; insert into public.secret_sent_desires(couple_id,option_id,from_user,to_user,note) values(target_couple_id,target_option_id,auth.uid(),partner,left(trim(coalesce(desire_note,'')),300)) returning * into r; return r; end $$;
grant execute on function public.send_secret_desire(uuid,uuid,text) to authenticated;
create or replace function public.get_secret_desires(target_couple_id uuid) returns table(id uuid,couple_id uuid,option_id uuid,option_title text,category_name text,from_user uuid,to_user uuid,note text,status text,created_at timestamptz) language sql stable security definer set search_path=public as $$ select d.id,d.couple_id,d.option_id,o.title,c.name,d.from_user,d.to_user,d.note,d.status,d.created_at from public.secret_sent_desires d join public.secret_options o on o.id=d.option_id join public.secret_categories c on c.id=o.category_id where d.couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by d.created_at desc $$;
grant execute on function public.get_secret_desires(uuid) to authenticated;
create or replace function public.update_secret_desire_status(target_desire_id uuid,new_status text) returns void language plpgsql security definer set search_path=public as $$ begin if new_status not in ('accepted','declined') then raise exception 'INVALID_STATUS'; end if; update public.secret_sent_desires set status=new_status where id=target_desire_id and to_user=auth.uid(); end $$;
grant execute on function public.update_secret_desire_status(uuid,text) to authenticated;

create or replace function public.get_secret_photos(target_couple_id uuid) returns setof public.secret_photos language sql stable security definer set search_path=public as $$ select * from public.secret_photos where couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by created_at desc $$;
grant execute on function public.get_secret_photos(uuid) to authenticated;
create or replace function public.create_secret_photo(target_couple_id uuid,photo_path text,photo_caption text default '') returns public.secret_photos language plpgsql security definer set search_path=public as $$ declare r public.secret_photos; begin if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; insert into public.secret_photos(couple_id,uploaded_by,path,caption) values(target_couple_id,auth.uid(),photo_path,left(trim(coalesce(photo_caption,'')),160)) returning * into r; return r; end $$;
grant execute on function public.create_secret_photo(uuid,text,text) to authenticated;
create or replace function public.delete_secret_photo(target_photo_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin delete from public.secret_photos where id=target_photo_id and uploaded_by=auth.uid(); end $$;
grant execute on function public.delete_secret_photo(uuid) to authenticated;

create or replace function public.get_secret_chat(target_couple_id uuid) returns setof public.secret_chat_messages language sql stable security definer set search_path=public as $$ select * from public.secret_chat_messages where couple_id=target_couple_id and public.is_couple_member(target_couple_id) order by created_at asc limit 500 $$;
grant execute on function public.get_secret_chat(uuid) to authenticated;
create or replace function public.send_secret_chat(target_couple_id uuid,message_body text) returns public.secret_chat_messages language plpgsql security definer set search_path=public as $$ declare r public.secret_chat_messages; begin if not public.is_couple_member(target_couple_id) then raise exception 'NOT_COUPLE_MEMBER'; end if; insert into public.secret_chat_messages(couple_id,sender_id,body) values(target_couple_id,auth.uid(),left(trim(message_body),2000)) returning * into r; return r; end $$;
grant execute on function public.send_secret_chat(uuid,text) to authenticated;
create or replace function public.delete_secret_chat_message(target_message_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin delete from public.secret_chat_messages where id=target_message_id and sender_id=auth.uid(); end $$;
grant execute on function public.delete_secret_chat_message(uuid) to authenticated;

alter table public.secret_categories replica identity full;
alter table public.secret_options replica identity full;
alter table public.secret_sent_desires replica identity full;
alter table public.secret_photos replica identity full;
alter table public.secret_chat_messages replica identity full;
do $$ begin alter publication supabase_realtime add table public.secret_categories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.secret_options; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.secret_sent_desires; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.secret_photos; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.secret_chat_messages; exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
