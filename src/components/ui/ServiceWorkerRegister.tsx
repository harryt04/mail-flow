'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // Dev never registers the SW (see below), but a tab that had it installed
      // before this gate existed will keep running that stale cache-first
      // worker indefinitely — browsers only re-check the SW *script* for
      // changes, not the app code that calls .register(). Self-heal any such
      // leftover registration so a plain reload is enough to recover, no
      // DevTools trip required.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length === 0) return
        Promise.all(registrations.map((r) => r.unregister())).then(() => {
          if (window.caches) {
            caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          }
          window.location.reload()
        })
      })
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a progressive enhancement — silently skip if registration fails.
    })
  }, [])

  return null
}
