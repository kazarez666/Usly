# Usly Web Push — запуск

Код поддерживает системные push-уведомления для четырёх событий:

- новое сообщение в чате;
- новая записка для пары;
- новое/изменённое чувство партнёра;
- новое/изменённое желание партнёра с интенсивностью.

## 1. Применить SQL

В Supabase откройте **SQL Editor** и выполните содержимое файла:

`supabase/024_web_push.sql`

Он создаст таблицу `push_subscriptions`, политики доступа и добавит in-app уведомления для записок и желаний.

## 2. Создать VAPID-ключи

На компьютере в терминале выполните:

```bash
npx web-push generate-vapid-keys
```

Команда выдаст два значения:

- `Public Key`
- `Private Key`

Private Key нельзя добавлять в клиентский код или публиковать в репозитории.

## 3. Добавить Public Key в GitHub Pages

В GitHub репозитории:

**Settings → Secrets and variables → Actions → New repository secret**

Создайте секрет:

`VITE_VAPID_PUBLIC_KEY`

Значение — `Public Key` из предыдущего шага.

## 4. Настроить Supabase Edge Function

В Supabase для Edge Functions добавьте secrets:

- `VAPID_PUBLIC_KEY` — Public Key;
- `VAPID_PRIVATE_KEY` — Private Key;
- `VAPID_SUBJECT` — например `mailto:your-email@example.com`.

Затем разверните функцию:

```bash
supabase functions deploy send-push
```

Функция лежит в `supabase/functions/send-push/index.ts`.

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` Edge Function получает из окружения Supabase автоматически.

## 5. Пересобрать Usly

После попадания изменений в `main` GitHub Pages пересоберётся автоматически. Workflow уже передаёт `VITE_VAPID_PUBLIC_KEY` в Vite build.

## 6. Телефоны

После обновления каждому партнёру нужно один раз открыть Usly на своём телефоне.

Если уведомления для Usly уже разрешены, приложение автоматически создаст Web Push subscription и сохранит её в Supabase.

Для iPhone Web Push работает для установленного на домашний экран PWA. Если разрешение ещё не выдавалось, запрос разрешения должен быть вызван пользовательским действием; helper `requestPushPermissionAndSubscribe()` уже подготовлен для будущей кнопки в настройках.

## Проверка

После открытия Usly на обоих телефонах:

1. Закрыть/свернуть Usly на телефоне Сони.
2. Отправить сообщение из чата с телефона Артёма.
3. Проверить системный push.
4. Затем проверить записку, чувство и желание.

Push — best effort: ошибка отправки push не ломает основное действие в Usly.
