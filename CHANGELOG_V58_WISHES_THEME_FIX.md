# Usly v58 — Wishes content theme fix

## Fixed
- The content opened by the `Активные / Выполненные / Отказы` tabs no longer uses the legacy dark palette.
- Wish cards, empty state, composer inputs, counters, headings and supporting text now inherit the active Usly theme.
- Mono theme now keeps the entire wishes content light/monochrome instead of showing a dark legacy panel.
- Custom-photo theme now uses translucent glass surfaces for wishes content.
- Core, Rush and Nocturne get their corresponding surface treatment.

## Root cause
The status tabs had theme-specific styles, but `.wish-card` and `.wish-empty` still had hard-coded colors from the original Wishes page. The fix scopes the entire wishes content to `.shared-wishes-hub[data-us-theme]` and overrides those legacy values.
