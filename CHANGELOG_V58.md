# Usly v58 — Wish Tabs Theme System

## Fixed
- Reworked the **Активные / Выполненные / Отказы** tabs in the wishes block as a real theme-aware component.
- Added a complete semantic token set for the `custom` photo theme so it no longer falls back to the default visual world.
- Added distinct tab treatment per visual world:
  - Core — soft romantic pills
  - Rush — sharp energetic controls
  - Nocturne — glass + glow
  - Mono — strict monochrome
  - Custom — translucent glass over the user's background
- Kept hover, active state, counters, borders and shadows tied to the active theme tokens.

## Validation
- Source changes are CSS-only for this fix.
- Full local build could not be executed in this sandbox because project dependencies are not installed and package installation is unavailable here. Run `npm ci && npm run build` locally before deploying.
