import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible_Next, Fraunces } from 'next/font/google'
import './globals.css'
import { ThemeScript } from '@/components/ui/ThemeScript'
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister'
import { SessionProviderClient } from '@/components/providers/SessionProviderClient'

const atkinson = Atkinson_Hyperlegible_Next({
  variable: '--font-atkinson',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  adjustFontFallback: false,
  fallback: ['system-ui', 'arial'],
})

// BRAND.md §4: Fraunces is sanctioned only for large display headlines on the
// marketing/landing page — never in the in-app product UI.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'MailFlow',
  description: 'The audiobook app for your inbox.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MailFlow',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#17140f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-bg text-text-primary flex min-h-full flex-col">
        <SessionProviderClient>{children}</SessionProviderClient>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
