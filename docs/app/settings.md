# src/app/(authenticated)/settings/

## Purpose
User preferences UI (served at `/settings`): OpenAI API key management, inbox scope/order,
playback speed, theme, voice tone, and account disconnect.

## Key files
| File | Role |
|---|---|
| `page.tsx` | Server component wrapper — thin wrapper rendering `SettingsClient`. Auth gating and the sidebar both come from `(authenticated)/layout.tsx`, not this file. |
| `SettingsClient.tsx` | Client component. Fetches/saves settings via `/api/settings`, drives theme via `useTheme`, handles OpenAI key management via `/api/settings/openai-key`, and handles the disconnect flow via `/api/settings/disconnect`. |

## Depends on
- `src/components/ui/{Card,Button,Badge,icons}`, `src/components/settings/ToggleGroup`, `src/components/settings/CategoryChecklist` — `SettingsClient.tsx`.
- `src/hooks/useTheme` — `SettingsClient.tsx`.
- `src/lib/types` (`InboxScope`, `InboxOrder`, `UserSettings`, `PlaybackSpeed`, `PLAYBACK_SPEEDS`) — shared shape with the API route.
- `next-auth/react` (`signOut`) for the disconnect flow's client-side sign-out.
- Calls `GET/POST/DELETE /api/settings` and `GET/POST/DELETE /api/settings/openai-key` and `POST /api/settings/disconnect` — see [docs/app/api/settings.md](./api/settings.md).

## Depended on by
Reached via the sidebar (`AppSidebar.tsx`) from any authenticated page; gated by both
`(authenticated)/layout.tsx` and `src/proxy.ts` like the rest of the authenticated app.

## Conventions
`SettingsClient.tsx` renders four `ToggleGroup` instances (inbox scope, inbox order, playback
speed, theme) — new mutually-exclusive settings should reuse `ToggleGroup` the same way rather
than building a bespoke control. `playbackSpeed` is also settable from `/listen` itself (a
compact cycling control, since PRD calls out wanting this without leaving the listening flow) —
both write-paths go through the same `POST /api/settings`.

## Where to add new code here
A new setting → add the field to `UserSettings` in `src/lib/types.ts`, extend
`GET/POST /api/settings` validation ([docs/app/api/settings.md](./api/settings.md)), then add
its UI here (a `ToggleGroup` if it's an enum, otherwise a new control following this file's
existing fetch/save pattern).
