# src/lib/db/

## Purpose
MongoDB access layer. A single lazily-created client connection plus typed accessors for each
collection — nothing outside this module (and `auth/options.ts`, for the one bootstrap call to
`ensureIndexes`) should import the `mongodb` driver directly.

## Key files
| File | Role |
|---|---|
| `client.ts` | `getMongoClient()` — creates the `MongoClient` lazily (not at module load, so `next build` doesn't need DB env vars) and caches it on `global` so it survives dev HMR reloads and warm serverless invocations. |
| `collections.ts` | `getDb()` plus one typed accessor per collection: `usersCollection`, `sessionsCollection`, `bookmarksCollection`, `emailActionLogsCollection`. Also `ensureIndexes()`. |

## Depends on
- `mongodb` driver only.
- `src/lib/types.ts` for the document types (`UserDoc`, `ListeningSessionDoc`, `BookmarkDoc`, `EmailActionLogDoc`) each accessor is generic over.

## Depended on by
Everything that persists state: `src/lib/auth/options.ts`, `src/lib/gmail/client.ts`, `src/lib/bookmark/session.ts`, and the API routes `settings`, `settings/disconnect`, `session`. See [docs/lib/bookmark.md](./bookmark.md) for the collection that gets the most traffic (sessions + bookmarks).

## Conventions
- Always go through a `*Collection()` accessor, never `getDb()`/`getMongoClient()` directly from outside `src/lib/db/`, so the document type stays enforced at the call site.
- Env vars: `MONGODB_URI` (client.ts), `MONGODB_DB` (collections.ts, defaults to `"mailflow"`).

## Where to add new code here
- A new collection → add its document type to `src/lib/types.ts`, then a new `*Collection()` accessor in `collections.ts` following the existing pattern (typed `Collection<T>` via `getDb()`).
- Do not add query/business logic here — this layer only returns typed collection handles. Domain logic (e.g. "get or create the active session") belongs in the owning module, e.g. `src/lib/bookmark/session.ts`.
