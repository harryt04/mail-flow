# src/proxy.ts — auth gating + locale detection

## Purpose
Next.js 16's replacement for `middleware.ts`. The single place route protection is enforced —
gates every authenticated page and API route before it runs. Also resolves the visitor's locale
on first request (see [docs/i18n.md](./i18n.md)) — this second responsibility runs on every
path, not just the protected ones, since the locale cookie has to be set even for unauthenticated
visitors (landing page, `/privacy`, `/tos`).

## Key files
| File | Role |
|---|---|
| `src/proxy.ts` | Default export `(req) => NextResponse`, plus a `config.matcher`. Must live inside `src/` (alongside `app/`), not the repo root — Next.js's `src/` convention requires it there or it's silently never registered. |

## How it works
- `config.matcher`: `["/((?!_next/static|_next/image|.*\\..*).*)"]` — runs on every path except
  Next's static asset internals and any path with a file extension (so it covers page routes and
  `/api/*`, but skips `sitemap.xml`/`manifest.webmanifest`/etc., which don't need auth or locale
  resolution).
- `PUBLIC_API_PREFIXES = ["/api/auth/"]` — excluded from the auth requirement (NextAuth's own routes must be reachable unauthenticated).
- `PROTECTED_PREFIXES = ["/home", "/listen", "/settings", "/inbox", "/onboarding", "/api/"]` — these require auth; everything else matched by the config above is allowed through.
- On auth failure: `/api/*` requests get a JSON 401 (with `code: 'UNAUTHORIZED'`, see [docs/i18n.md](./i18n.md#api-errors)); page routes get redirected to `/`.
- Locale: if no `NEXT_LOCALE` cookie is present, negotiates the `Accept-Language` header against
  `src/i18n/config.ts`'s `locales` (via `negotiator` + `@formatjs/intl-localematcher`) and sets
  the resolved locale as a year-long `NEXT_LOCALE` cookie on the response. Runs after the auth
  check, on every allowed request (including unprotected ones).

## Depends on
- `src/lib/auth/options` (`auth`) — the same session check used by `requireUser()` in routes ([docs/lib/auth.md](./lib/auth.md)), applied here at the edge before the route/page even runs.
- `src/i18n/config.ts` (`locales`, `defaultLocale`, `localeCookieName`).
- `negotiator`, `@formatjs/intl-localematcher` — `Accept-Language` negotiation.
- `next/server` (`NextResponse`).

## Depended on by
Implicitly, every page and API route (except `/api/auth/*` for the auth check specifically) —
this is the first checkpoint, before `requireUser()` runs again inside the individual route/page.
The two auth checks are intentionally redundant: `src/proxy.ts` blocks at the edge, `requireUser()`
guarantees the route never runs unauthenticated even if reached directly. `src/i18n/request.ts`
depends on the `NEXT_LOCALE` cookie this file sets.

## Where to add new code here
- A new authenticated page or route prefix → add it to `PROTECTED_PREFIXES` here (the matcher
  already covers it), or it will be reachable without auth even though the page/route itself may
  still separately call `requireUser()`.
- A new public (unauthenticated) API route → add its prefix to `PUBLIC_API_PREFIXES`.
- A new supported locale → add it to `src/i18n/config.ts`'s `locales`, not here — this file
  reads that list, it doesn't hardcode locales itself.
- Do not add business logic here beyond allow/redirect/401 and locale-cookie negotiation.
