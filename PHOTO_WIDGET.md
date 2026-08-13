# Locket-style photo screen

Usly now has a `/widget/` screen that shows the latest photo saved by the app. The main Photo tab exposes an **Открыть фото** action and, when the browser exposes `beforeinstallprompt`, an **Установить Usly** action.

This is intentionally a web/PWA-compatible step. A real OS home-screen widget requires a native iOS WidgetKit and/or Android AppWidget target, which can be added later without changing the shared photo data model.
