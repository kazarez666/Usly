# Usly v55 setup / QA

## What changed
- Achievement preview no longer renders the duplicate `365 365` label; the milestone is now `Год вместе`.
- Secret Room and Room of Truth entry buttons are now the final blocks on the Us page, after the horoscope.
- Room entry buttons inherit all four themes, including Mono/light.
- Horoscope body text now uses the active theme text color, so it remains readable in Mono/light.
- Shared wishes are compacted into three status tabs: `Активные`, `Выполненные`, `Отказы`.
- Room password RPCs were fixed for Supabase pgcrypto installations where `gen_salt` is not reachable through `search_path=public`.

## Supabase migration
Run this SQL in Supabase SQL Editor after the previous migrations:

`supabase/021_room_passwords_pgcrypto_fix.sql`

It keeps the same RPC names (`set_room_password`, `verify_room_password`) so no frontend configuration change is required.

## Local validation
The environment used for packaging has an incomplete `node_modules` cache, so a full `npm run build` could not be completed here. `src/App.tsx` and `src/main.tsx` were still parsed/transpiled with the installed TypeScript compiler successfully.
