export const locales = ['en-US'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en-US'

export const localeCookieName = 'NEXT_LOCALE'

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)
