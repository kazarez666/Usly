# Usly v57 — privacy, reading room, horoscope freshness & custom theme

- Fixed relationship-reading content in Room of Truth: materials are now an in-app reading library with short summaries and full original summaries/paraphrases, instead of external article cards.
- Added separate tabs in Room of Truth: **Наши разговоры** and **Литература для отношений**.
- Added six evidence-based relationship-reading pieces grounded in verified sources (PubMed/NIH and The Gottman Institute), with source attribution kept inside the room.
- Strengthened cross-theme styling for wishes tabs, status tabs and Room of Truth tabs.
- Added a fifth visual world: **Своё фото**. The existing private profile background can now be selected as the app's full-page visual background.
- Fixed the custom background rendering so the theme's app background is not overridden by the generic shell background.
- Improved horoscope freshness: daily requests are cache-busted and sent with `no-store`; the UI now shows the exact forecast date and has a manual refresh control while still refreshing automatically.
- Added a best-effort Secret Room privacy shield that hides room content when the browser window/tab loses focus or visibility. Browser APIs do not expose a reliable screenshot event, so this is intentionally documented as best-effort rather than a guarantee.
- Kept the Secret Room focused on **Фото / Чат / Желания**; shared desires continue to flow into the main **Мы → Ваши желания** area.
