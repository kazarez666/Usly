# Usly v53 — Private Room + Room of Truth split

## Room of Truth
- Moved Room of Truth out of the main "Мы" content into its own screen, opened from a compact entry card.
- Kept the psychologically-informed conversation flow: observation → feeling → need → request, with topic statuses and replies.

## Secret Room
The previous secret-room notes/desire prototype is replaced in the UI by a dedicated three-part private room:

1. **Желания** — configurable categories, custom options, sending a selected desire to the partner, incoming desire list with accept/decline, and realtime updates.
2. **Фото** — private couple-only photo storage with signed URLs, captions, upload and delete.
3. **Чат** — separate private chat storage, realtime messages, and sender-side deletion.

Default desire categories are seeded as:
- Позы
- Места
- Настроение
- Игры
- Ласки

Custom categories can be created, renamed, and deleted. Default categories can be renamed but not deleted.

## Supabase
Run `supabase/019_secret_room_v2.sql` once in the Supabase SQL editor after the previous migrations.

The migration creates:
- `secret_categories`
- `secret_options`
- `secret_sent_desires`
- `secret_photos`
- `secret_chat_messages`
- private `secret-media` storage bucket + RLS policies
- realtime publication entries
- RPCs for all private-room operations

The old secret-room tables remain in the database for backward compatibility but are no longer rendered by the v53 UI.
