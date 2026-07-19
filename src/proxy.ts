import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/options'
import { defaultLocale, locales, localeCookieName } from '@/i18n/config'

const PROTECTED_PREFIXES = [
  '/home',
  '/listen',
  '/settings',
  '/inbox',
  '/onboarding',
  '/api/',
]
const PUBLIC_API_PREFIXES = ['/api/auth/']

function resolveLocale(req: Parameters<Parameters<typeof auth>[0]>[0]) {
  const cookieLocale = req.cookies.get(localeCookieName)?.value
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale
  }

  const negotiator = new Negotiator({
    headers: {
      'accept-language': req.headers.get('accept-language') ?? undefined,
    },
  })
  try {
    return match(negotiator.languages(), locales, defaultLocale)
  } catch {
    return defaultLocale
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  const isProtected =
    !isPublicApi && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  const response = NextResponse.next()
  if (!req.cookies.get(localeCookieName)) {
    response.cookies.set(localeCookieName, resolveLocale(req), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }
  return response
})

export const config = {
  // Runs on every page/API route (excluding static assets and files with an
  // extension) so the locale-detection cookie gets set on first visit, even
  // for unauthenticated/public pages like the landing page.
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
