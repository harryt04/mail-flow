# src/app/home/

## Purpose
The authenticated landing/dashboard page — shows current listening-session progress (or a
"fresh inbox" message), an idle-state confidence-boost dashboard of what's been sorted so far,
and buttons into `/listen` and `/inbox`.

## Key files
| File | Role |
|---|---|
| `page.tsx` | Server component. Checks `auth()`, calls `getActiveSessionProgress` and `getActionCounts` directly (not via an API route), renders `AppHeader`, `Button`s linking to `/listen` and `/inbox`, and `DashboardStats`. |

## Depends on
- `src/lib/auth/options` (`auth`)
- `src/lib/bookmark/session` (`getActiveSessionProgress`) and `src/lib/bookmark/stats` (`getActionCounts`) — see [docs/lib/bookmark.md](../lib/bookmark.md)
- `src/components/ui/{AppHeader,Button}`, `src/components/home/DashboardStats`

## Depended on by
Entry point after login — `src/app/page.tsx` redirects here, and `proxy.ts` gates access (see [docs/proxy-and-routing.md](../proxy-and-routing.md)).

## Conventions
- When the active session's snapshot was capped (`MAX_SNAPSHOT_SIZE` guardrail, see
  `docs/lib/gmail.md`'s `buildInboxSnapshot`) and Gmail's `totalEstimate` exceeds the snapshot
  size, the progress copy says so explicitly ("Working through the oldest N of ~M unread
  emails…") rather than implying the cap is the user's whole inbox. Snapshots are immutable
  once created (PRD §9.3), so an existing session built under an older/lower cap won't pick up
  a raised cap until it's exhausted or the user changes scope/order in Settings to force a
  fresh one.
- `DashboardStats` (`src/components/home/DashboardStats.tsx`) is presentational only — it
  receives `counts: ActionCounts` as a prop and does no fetching itself, consistent with this
  page's server-component-calls-lib-directly pattern.

## Where to add new code here
This is a server component that reads session/stat state directly through `lib/bookmark`
functions rather than fetching `/api/*` — if adding dashboard content that needs other
server-side data, follow the same direct-call pattern (server component → `lib/*` function)
rather than introducing a client-side fetch here.
