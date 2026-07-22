# MailFlow docs

Read this first. MailFlow is a mobile-first PWA that reads a user's Gmail inbox aloud and
takes voice commands between paragraphs — see [ARCHITECTURE.md](./ARCHITECTURE.md) for the
full picture and five end-to-end feature flows.

**Doc philosophy**: these docs are a map, not an API reference. Each module doc covers
purpose, key files, dependencies, and where to add new code — not full function-signature
documentation or a restatement of logic the code already shows. That makes them cheap to keep
current: **update the relevant doc in the same change whenever you add a file, move a
directory, or change what depends on what.** Docs describing internal logic are deliberately
excluded to avoid rot — keep it that way when editing.

If you're not sure where to look, check [DECISION-TREE.md](./DECISION-TREE.md) first — it's a
task → file lookup table.

## Doc index
| Doc | Read if you need to touch |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | The system as a whole, or any single feature end-to-end |
| [DECISION-TREE.md](./DECISION-TREE.md) | You're not sure where a piece of code belongs |
| [lib/README.md](./lib/README.md) | The backend/domain layer overview |
| [lib/auth.md](./lib/auth.md) | Login, sessions, token encryption |
| [lib/db.md](./lib/db.md) | MongoDB access |
| [lib/gmail.md](./lib/gmail.md) | Gmail API integration |
| [lib/bookmark.md](./lib/bookmark.md) | Listening-session progress/checkpoints |
| [lib/voice.md](./lib/voice.md) | Command matching, reply cleanup, STT, TTS |
| [hooks.md](./hooks.md) | Mic capture, audio playback, theme (client hooks) |
| [components/README.md](./components/README.md) | UI components overview + conventions |
| [components/ui.md](./components/ui.md) | Generic design-system primitives |
| [components/listening.md](./components/listening.md) | Voice-session visual states |
| [components/settings.md](./components/settings.md) | The settings `ToggleGroup` control |
| [components/landing.md](./components/landing.md) | Logged-out landing page sections |
| [app/README.md](./app/README.md) | Root layout, landing page, global CSS, and the `(authenticated)` route group layout (sidebar nav + auth gate shared by every logged-in page) |
| [app/home.md](./app/home.md) | The authenticated dashboard |
| [app/inbox.md](./app/inbox.md) | The paginated inbox browser + bookmark jump |
| [app/listen.md](./app/listen.md) | The core listening screen + state machine |
| [app/settings.md](./app/settings.md) | The settings page |
| [app/api/README.md](./app/api/README.md) | All API routes — route table + conventions |
| [i18n.md](./i18n.md) | Adding/translating UI strings, the message catalog, locale resolution |
| [proxy-and-routing.md](./proxy-and-routing.md) | Auth gating and locale detection at the edge (`src/proxy.ts`) |
| [public-assets.md](./public-assets.md) | The mic-audio worklet and the service worker |
| [testing.md](./testing.md) | Running unit/component tests (Vitest) and e2e tests (Playwright) |
| [hermes-kanban.md](./hermes-kanban.md) | Hermes Kanban ops: tenant `mail-flow`, jarvis/coder roles, PR + review-required flow |

## Other docs in this repo
`mvp-docs/` holds pre-implementation planning docs (PRD, brand guide, provider analysis,
implementation plan, and a build log) — useful for historical context on *why* decisions were
made, but not kept current as ongoing reference the way `docs/` is.
