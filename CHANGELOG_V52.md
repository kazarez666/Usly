# Usly v52 — Room of Truth

## What changed
- Added **Room of Truth** to the `Мы` page.
- Added a shared, couple-only conversation model with:
  - concern / change / add / appreciation / important categories;
  - first-person, non-blaming prompts;
  - optional feeling + concrete request fields;
  - replies from both partners;
  - status flow: Open → Discussing → Agreed → Closed;
  - realtime Supabase updates;
  - theme-aware styling and responsive layout;
  - a safety note that this is relationship education, not therapy.
- Added a new `truthRoom` block toggle in Settings → Blocks → Us.
- Tightened the top spacing of the Achievements card and other Us secondary cards.
- Changed the 365-day achievement title from `Год вместе` with a `365` badge to **`365 дней вместе`**, removing the awkward duplicated meaning.

## Supabase
Run `supabase/018_truth_room.sql` once in the Supabase SQL editor before using the shared Room of Truth in production.
