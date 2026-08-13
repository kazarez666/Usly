# Usly v49 — Final Product Polish

## UX
- Removed the oversized “Your space” settings card from the Us tab.
- Couple name editing is now a compact inline control instead of a full-width technical block.
- Relationship date remains only in “Your dates”.
- Achievement section stays collapsed and previews the next locked achievement.
- Tightened vertical spacing across the Us page to reduce oversized top gaps.

## Stability
- Added a section-level React error boundary so a render error in one tab no longer turns the whole app into a blank screen.
- Kept the existing private moments calendar inside Secret Room.
- Strengthened theme token overrides for chat, secret-room surfaces, and secondary cards so legacy hard-coded colors do not leak across Core/Rush/Nocturne/Mono.

## Visual consistency
- Refined inline editor, achievement preview, error state, and secondary surfaces to use active theme variables.
- Preserved the existing distinct statistic-card treatments.
