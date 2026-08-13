# Usly v50 — Product hardening pass

## UX
- Achievement panel remembers whether it was expanded for this couple on the current device.
- Private moments calendar remembers its collapsed/expanded state inside Secret Room.
- Secret Room now returns to the place it was opened from: “Мы” when opened from the Us tab, Home when opened from Settings.
- Removed a duplicated “Покинуть пару” heading from Settings.

## Stability
- Kept the section-level error boundary from v49.
- No new database migrations are required for this pass.

## Product direction
- Dates remain consolidated in “Ваши даты”.
- Intimate moments remain inside Secret Room.
- Achievements stay compact by default.
- Block visibility remains configurable per device/couple through Settings.
