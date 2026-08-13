-- Usly: in-app notifications between two partners.
-- Creates notifications from the events already present in the app.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('message','feeling','moment','wish_joined','wish_done')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (recipient_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (recipient_id = auth.uid() and public.is_couple_member(couple_id))
with check (recipient_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications for delete to authenticated
using (recipient_id = auth.uid() and public.is_couple_member(couple_id));

grant select, update, delete on public.notifications to authenticated;

create or replace function public.create_usly_notification(
  p_couple_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    couple_id, recipient_id, actor_id, type, title, body, entity_type, entity_id
  )
  select
    p_couple_id, cm.user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  from public.couple_members cm
  where cm.couple_id = p_couple_id
    and cm.user_id <> p_actor_id;
end;
$$;

grant execute on function public.create_usly_notification(uuid, uuid, text, text, text, text, uuid) to authenticated;

create or replace function public.notify_message_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.create_usly_notification(
    new.couple_id, new.sender_id, 'message', 'Новое сообщение',
    left(new.body, 160), 'message', new.id
  );
  return new;
end;
$$;

drop trigger if exists usly_notify_message on public.messages;
create trigger usly_notify_message
after insert on public.messages
for each row execute procedure public.notify_message_insert();

create or replace function public.notify_feeling_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare label text;
begin
  if tg_op = 'UPDATE' and old.mood = new.mood and coalesce(old.note, '') = coalesce(new.note, '') then
    return new;
  end if;
  label := case new.mood
    when 'love' then 'Влюблён(а) ❤️'
    when 'happy' then 'Счастлив(а) 😊'
    when 'calm' then 'Спокойно 😌'
    when 'sad' then 'Грустно 😔'
    when 'angry' then 'Злюсь 😡'
    when 'miss' then 'Скучаю 🥺'
    else new.mood
  end;
  perform public.create_usly_notification(
    new.couple_id, new.user_id, 'feeling', 'Партнёр изменил чувство', label,
    'feeling', new.id
  );
  return new;
end;
$$;

drop trigger if exists usly_notify_feeling on public.couple_feelings;
create trigger usly_notify_feeling
after insert or update on public.couple_feelings
for each row execute procedure public.notify_feeling_change();

create or replace function public.notify_moment_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.create_usly_notification(
    new.couple_id, new.user_id, 'moment', 'Новый момент',
    coalesce(nullif(left(new.title, 160), ''), 'Партнёр добавил новый момент'), 'moment', new.id
  );
  return new;
end;
$$;

drop trigger if exists usly_notify_moment on public.moments;
create trigger usly_notify_moment
after insert on public.moments
for each row execute procedure public.notify_moment_insert();

create or replace function public.notify_wish_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare actor uuid;
begin
  if tg_op = 'INSERT' then
    -- Создателю желание не нужно уведомление.
    return new;
  end if;

  if old.joined_by is distinct from new.joined_by and new.joined_by is not null then
    actor := new.joined_by;
    perform public.create_usly_notification(
      new.couple_id, actor, 'wish_joined', 'Партнёр тоже хочет этого',
      new.title, 'wish', new.id
    );
  end if;

  if old.status is distinct from new.status and new.status = 'done' then
    actor := coalesce(auth.uid(), new.joined_by, new.created_by);
    perform public.create_usly_notification(
      new.couple_id, actor, 'wish_done', 'Желание исполнено ❤️',
      new.title, 'wish', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists usly_notify_wish on public.couple_wishes;
create trigger usly_notify_wish
after update on public.couple_wishes
for each row execute procedure public.notify_wish_change();

-- Realtime for the notification center.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

alter table public.notifications replica identity full;
notify pgrst, 'reload schema';
