# Usly Phase 3 — Feelings

## 1. Replace the project files
Use the included `src/App.tsx`, `src/styles.css` and `src/lib/feelings.ts`.

## 2. Run the new SQL in Supabase
Open **SQL Editor**, paste the full contents of:

`supabase/003_feelings.sql`

Run it once.

## 3. Start the app
From the project folder:

```powershell
npm run dev
```

## 4. Test
1. Open Usly and sign in.
2. Enter your existing couple space.
3. Press **«Чувства»** in the bottom navigation.
4. Pick a feeling.
5. Optionally write a short note.
6. Press **«Показать чувство»**.
7. The new feeling should appear in **«Ваши чувства»**.

Open the same account/couple on the second device/browser and refresh: the feeling should be visible there too.

## Phase 4 — Chat

Run `supabase/005_chat.sql` once in Supabase SQL Editor. This creates the private couple chat, RLS policies, indexes and Realtime publication entry.
