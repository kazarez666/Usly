# Usly v25 — profile identity + video circles

## Supabase
Run once:
- `supabase/015_profile_identity_and_chat_video.sql`

This migration adds:
- profile gender (`male` / `female`)
- zodiac sign
- private profile background photo
- private `chat-media` storage
- video message fields on `messages`
- updated `get_my_us()` RPC

## Frontend
- Partner labels use gender in Russian: `Партнёр` / `Партнёрша`.
- Common feelings are rendered without `(а)`.
- Profile lets the user choose gender, zodiac and app background.
- Nocturne has an irregular star field and a zodiac constellation overlay.
- The manual refresh icon was removed because the app already uses realtime subscriptions.
- Chat has Telegram-like video circles, max 20 seconds / 20 MB. Browser camera+microphone permission is required.
- MP4 is preferred when the browser supports it; otherwise WebM is used.

## Horoscope / compatibility
Not wired into the app yet. Recommended architecture: fetch daily horoscope data server-side, cache one result per sign/day, then serve it to the client. This avoids a worker and avoids exposing an API key in the browser.
