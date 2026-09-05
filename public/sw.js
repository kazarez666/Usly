self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Usly', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil((async () => {
    // Chat messages are already rendered live inside Usly. If the recipient is
    // actively looking at the app, do not duplicate that with an iOS banner.
    // Other event types (feelings, desires, notes) still show normally.
    if (data.type === 'message') {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const uslyVisible = windows.some(client => {
        const visibility = 'visibilityState' in client ? client.visibilityState : undefined
        const focused = 'focused' in client ? client.focused : false
        return client.url.startsWith(self.registration.scope) && (visibility === 'visible' || focused === true)
      })
      if (uslyVisible) return
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

    await self.registration.showNotification(title, options)
  })())
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
