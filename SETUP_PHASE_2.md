# Usly — Phase 2 setup

## 1. Replace the local project files

Extract this archive over your existing `Usly` project and choose **Replace files** when Windows asks.

Do NOT delete `node_modules`; it is not included in this archive.

## 2. Supabase

Open **Supabase → SQL Editor → New query**.

Run the entire file:

`supabase/002_couples_phase2.sql`

This migration is designed for the current Usly starter schema. It adds the invite code and the couple RPCs without requiring you to recreate the database.

## 3. Environment

Create `.env.local` in the project root if it does not exist, using `.env.example` as the template:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never commit `.env.local`.

## 4. Check the app

```powershell
npm run build
npm run dev
```

Open:

`http://127.0.0.1:5173/`

## 5. Test the couple flow

1. Register account A.
2. Create a couple and copy the 8-character invite code.
3. Open a private/incognito browser window.
4. Register account B.
5. Join using the invite code.
6. Account A should show `2 / 2`.

The application uses Supabase Auth for identity and RLS for couple data isolation.
