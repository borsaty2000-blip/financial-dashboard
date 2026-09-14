const CACHE_NAME = 'borsaty-shell-v1'
const APP_SHELL = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
	)
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
	const payload = event.data?.json?.() ?? { title: 'بورصتي', body: 'لديك إشعار جديد' }
	event.waitUntil(self.registration.showNotification(payload.title ?? 'بورصتي', { body: payload.body ?? '', icon: payload.icon ?? '/favicon.svg', data: { url: payload.link ?? '/', ...(payload.data ?? {}) } }))
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()
	const target = event.notification.data?.url ?? '/'
	event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
		const existing = clients.find((client) => 'focus' in client)
		if (existing) { existing.navigate(target); return existing.focus() }
		return self.clients.openWindow(target)
	}))
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (
		request.method !== 'GET' ||
		new URL(request.url).pathname.startsWith('/api/')
	)
		return
	event.respondWith(fetch(request).catch(() => caches.match(request)))
})
