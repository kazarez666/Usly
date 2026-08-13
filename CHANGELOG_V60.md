# Usly v60 — Beta hardening

## Security
- Removed browser access to the internal notification creation RPC so clients cannot forge arbitrary in-app notifications.
- Removed browser access to notification trigger helper functions; they remain database-internal.
- Tightened chat-media uploads so only users who already belong to a couple can create chat-media objects.

## Developer checks
- Added `npm run typecheck`.
- Added `npm run check` as the lightweight pre-beta validation command.

## Next
- Apply `supabase/023_beta_hardening.sql` after the existing migrations.
- Run `npm ci`, then `npm run check`, then `npm run build` locally before deployment.
