import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible_Next, Fraunces } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')

  return {
    title: 'MailFlow',
    description: t('description'),
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'MailFlow',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#17140f' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${atkinson.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-bg text-text-primary flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProviderClient>{children}</SessionProviderClient>
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
