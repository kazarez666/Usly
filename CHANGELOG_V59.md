# Usly v59 — Product hardening

## Included
- Horoscope refresh now supports an explicit cache-bypass refresh and automatically refreshes around the local midnight boundary, so an old day's reading cannot remain indefinitely in an open tab.
- Secret room now auto-locks after 10 minutes of inactivity and keeps the existing blur/visibility privacy shield.
- Added focus-visible states and mobile polish for room/wish controls.
- Added theme-aware native date/time control rendering and reduced-motion support.

## Validation
- `npx tsc -b --pretty false` passes.
- Vite production build could not be completed in the Linux sandbox because the extracted `node_modules` is missing Rollup's Linux optional native package. Run `npm ci && npm run build` locally on the development machine.
