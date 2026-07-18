# src/app/home/

## Purpose
The authenticated landing/dashboard page — shows current listening-session progress or a
"fresh inbox" message, with a button into `/listen`.

## Key files
| File | Role |
|---|---|
| `page.tsx` (29 lines) | Server component. Checks `auth()`, calls `getActiveSessionProgress` directly (not via an API route), renders `AppHeader` + a `Button` linking to `/listen`. |

## Depends on
- `src/lib/auth/options` (`auth`)
- `src/lib/bookmark/session` (`getActiveSessionProgress`) — see [docs/lib/bookmark.md](../lib/bookmark.md)
- `src/components/ui/{AppHeader,Button}`

## Depended on by
Entry point after login — `src/app/page.tsx` redirects here, and `proxy.ts` gates access (see [docs/proxy-and-routing.md](../proxy-and-routing.md)).

## Where to add new code here
This is a server component that reads session state directly through the `lib/bookmark`
function rather than fetching `/api/session` — if adding dashboard content that needs other
server-side data, follow the same direct-call pattern (server component → `lib/*` function)
rather than introducing a client-side fetch here.
