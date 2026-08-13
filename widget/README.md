# Usly photo screen / Locket-style integration

The web app stores the latest shared photo under `usly-latest-photo-<coupleId>` in localStorage.

`/widget/` is a standalone, mobile-friendly photo screen that reads that value and refreshes periodically. It is useful as a browser/PWA shortcut and as the hand-off surface for a future native widget.

A true home-screen widget on iOS/Android still requires a native WidgetKit/AppWidget target; a browser-only React/Vite app cannot create that OS widget by itself.
