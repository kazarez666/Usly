-- Usly Web Push subscriptions + notification coverage for notes/desires.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, updated_at desc);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own
on public.push_subscriptions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Expand the in-app notification center with the two new event types.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message','feeling','moment','wish_joined','wish_done','note','desire'));

create or replace function public.notify_couple_note_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.create_usly_notification(
    new.couple_id,
    new.created_by,
    'note',
    'Новая записка для вас двоих',
    left(new.body, 160),
    'note',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists usly_notify_couple_note on public.couple_notes;
create trigger usly_notify_couple_note
after insert on public.couple_notes
for each row execute procedure public.notify_couple_note_insert();

create or replace function public.notify_desire_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.desire = new.desire
     and old.intensity = new.intensity then
    return new;
  end if;

  perform public.create_usly_notification(
    new.couple_id,
    new.user_id,
    'desire',
    'Новое желание партнёра',
    left(new.desire, 120) || ' — ' || new.intensity::text || '/10',
    'desire',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists usly_notify_desire on public.couple_desires;
create trigger usly_notify_desire
after insert or update on public.couple_desires
for each row execute procedure public.notify_desire_change();

notify pgrst, 'reload schema';
