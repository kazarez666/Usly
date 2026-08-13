# Usly v54

## Changes

- Fixed achievement copy: `365 дней вместе` is no longer rendered as `365 365 дней вместе`.
- Replaced separate Room of Truth / Private Room cards in the Us page with a compact two-button row.
- Added shared passwords for both rooms.
  - First entry creates the room password.
  - Existing members can change the room password from the gate.
  - Secret Room keeps the 18+ confirmation.
  - Password hashes use `pgcrypto` bcrypt and are never exposed through direct table reads.
- Moved Secret Room desires into the shared Wishes hub in the Us page.
- The Wishes hub now has two modes in one block:
  - `Список желаний` — normal couple wishes + Secret Room wishes.
  - `Виш-лист` — gift wishes with links/notes.
- Secret desires now have a full lifecycle:
  - pending
  - accepted
  - completed
  - declined
- A partner can accept or decline an incoming private desire; accepted desires can later be marked completed.
- Declined private desires are retained in a separate `Отказы` section instead of disappearing.
- Added responsive styling for the paired room buttons, password gates, tabs and shared wish cards.

## Supabase

Run `supabase/020_room_passwords_and_wish_status.sql` after the previous migrations.
