# src/app/api/auth/[...nextauth]/

## Purpose
The NextAuth catch-all route — a 3-line delegation to the handlers configured in
`src/lib/auth/options.ts`. All actual auth configuration (Google provider, callbacks, token
encryption) lives there; see [docs/lib/auth.md](../../lib/auth.md).

## Key files
| File | Role |
|---|---|
| `route.ts` (3 lines) | Exports `GET`/`POST` = NextAuth's `handlers` from `src/lib/auth/options`. |

## Where to add new code here
Do not add logic to this file. Auth behavior changes (new provider, new callback logic,
new scopes) belong in `src/lib/auth/options.ts` — this route only wires NextAuth's handlers
into the Next.js router.
