# Usly v55 — final QA fixes

- Fixed duplicate achievement wording (`365 365 дней вместе`) by using `Год вместе` / `One year together`.
- Moved the Secret Room / Room of Truth entry buttons to the bottom of the Us page, after the horoscope.
- Added theme-aware styling for both room entry buttons, including the light Mono theme.
- Fixed horoscope text contrast so the reading remains visible in the light Mono theme.
- Split the shared wishes area into compact status tabs: Active / Completed / Declined.
- Added `supabase/021_room_passwords_pgcrypto_fix.sql` to fix `gen_salt(unknown, integer) does not exist` on Supabase installations where pgcrypto functions are exposed through the `extensions` schema.
