# Usly v10 — Profiles & Avatars

This version adds personal names and private avatars across the Usly space.

## Supabase
Run `supabase/008_profiles_avatars.sql` once in the SQL Editor.

It creates a private `avatars` bucket, storage policies for each user's own folder, and adds `profiles` to Supabase Realtime when needed.

## App
Run:

```bash
npm install
npm run dev
```

Profiles are edited from **Мы → Изменить**. Avatars are stored privately and displayed through signed URLs.
