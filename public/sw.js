self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Usly', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Usly'
  const options = {
    body: data.body || '',
    icon: './icons/usly-192.png',
    badge: './icons/usly-192.png',
    tag: data.tag || undefined,
    data: {
      url: data.url || self.registration.scope,
      type: data.type || null,
      entityId: data.entityId || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope).href

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) {
        await client.focus()
        if ('navigate' in client && client.url !== targetUrl) await client.navigate(targetUrl)
        return
      }
    }
    await clients.openWindow(targetUrl)
  })())
})
