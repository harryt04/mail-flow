const STATIC_CACHE = 'mailflow-static-v1'

// Install-only service worker: enables "Add to Home Screen" installability.
// No offline mode (PRD non-goal) — API/data routes always go to the network.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Network-first for API routes and navigations — always want fresh data/HTML.
  if (url.pathname.startsWith('/api/')) return

  // Cache-first for static assets and fonts.
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(woff2?|ttf|otf)$/)

  if (!isStaticAsset) return

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    }),
  )
})
