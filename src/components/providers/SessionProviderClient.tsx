'use client'

import { SessionProvider } from 'next-auth/react'

/** Thin client wrapper so RootLayout (a server component) can provide the session context useSession() needs — next-auth's SessionProvider itself must run client-side. */
export function SessionProviderClient({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>
}
