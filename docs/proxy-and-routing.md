# proxy.ts — auth gating

## Purpose
Next.js 16's replacement for `middleware.ts`. The single place route protection is enforced —
gates every authenticated page and API route before it runs.

## Key files
| File | Role |
|---|---|
| `proxy.ts` (repo root, 27 lines) | Default export `(req) => NextResponse`, plus a `config.matcher`. |

## How it works
- `config.matcher`: `["/home/:path*", "/listen/:path*", "/settings/:path*", "/api/:path*"]` — the only paths this runs on.
- `PUBLIC_API_PREFIXES = ["/api/auth/"]` — excluded from the auth requirement (NextAuth's own routes must be reachable unauthenticated).
- `PROTECTED_PREFIXES = ["/home", "/listen", "/settings", "/api/"]` — everything else matched requires auth.
- On failure: `/api/*` requests get a JSON 401; page routes (`/home`, `/listen`, `/settings`) get redirected to `/`.

## Depends on
- `src/lib/auth/options` (`auth`) — the same session check used by `requireUser()` in routes ([docs/lib/auth.md](./lib/auth.md)), applied here at the edge before the route/page even runs.
- `next/server` (`NextResponse`).

## Depended on by
Implicitly, every page under `/home`, `/listen`, `/settings` and every route under `/api/*`
(except `/api/auth/*`) — this is the first checkpoint, before `requireUser()` runs again inside
the individual route/page. The two checks are intentionally redundant: `proxy.ts` blocks at the
edge, `requireUser()` guarantees the route never runs unauthenticated even if reached directly.

## Where to add new code here
- A new authenticated page or route prefix → add it to both `config.matcher` and
  `PROTECTED_PREFIXES` here, or it will be reachable without auth even though the page/route
  itself may still separately call `requireUser()`.
- A new public (unauthenticated) API route → add its prefix to `PUBLIC_API_PREFIXES`.
- Do not add business logic here — this file only decides allow/redirect/401, nothing else.
