<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read the docs before exploring

Before searching the codebase, read [docs/README.md](docs/README.md) — it indexes a `docs/`
tree that mirrors `src/` and answers "where does X live" / "where should new code for X go"
for most tasks. Check [docs/DECISION-TREE.md](docs/DECISION-TREE.md) if you're not sure which
doc applies. If the docs don't answer your question, explore as normal, then update the
relevant `docs/*.md` file with what you learned in the same change — these docs are a map
(purpose, key files, dependencies, where to add code), not an API reference, so keep additions
at that level rather than documenting internal logic line-by-line.


# Important
Before considering your work done, please format/validate by running `pnpm run prettify; pnpm run ci`

## UI SDK

UI SDK supplies unstyled React primitives for keyboard interaction, focus management, accessibility and agent actions. Both `@ui-sdk/react` and `@ui-sdk/core` are exact-pinned at `0.1.0-beta.17`. Before changing components, read `node_modules/@ui-sdk/react/docs/llms.txt` and `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md`. The library postdates model training data. Check each component's installed documentation.

App code imports the wrappers in `src/components/ui`. Add a wrapper around parts from a per-component entry such as `@ui-sdk/react/dialog`. Never run `shadcn add` or regenerate the wrappers, which reintroduces Radix or Base UI. Preserve Tailwind v4 classes, theme tokens and accessible names. MailFlow omits the optional global SDK stylesheet. The SDK owns `data-slot`; use app-specific markers for custom selectors. Connect controlled fields with `value` and `onValueChange` so browser-agent edits reach React. Mount form popups outside forms, and check Escape, focus return and hydration.

The root layout mounts `src/components/providers/AgentBridge.tsx`. WebMCP exposes reads of visible SDK state. Every new interactive control needs a decision in `src/lib/agent/policy.ts` and tests for any new permission. Only explicitly marked home/inbox navigation and inbox search edits are enabled. Keep mail actions, authentication, settings, account changes and irreversible actions denied. Use `data-agent-confirm` to reserve controls for people. Use `data-agent-secret` for private values and `data-agent-hidden` for private content or labels.

Use `toggle-group.tsx`, `select.tsx`, and `textarea.tsx` for grouped choices, popup choices, and multiline text. Settings choices use UI SDK toggle groups that keep focus on the activated item while saving disables the group.

Sidebar uses local layout components and shares the local Slot helper (`src/components/ui/slot.tsx`) with Badge. Dropdown Menu wraps UI SDK Menu. Its tri-state checkbox uses MenuCheckboxItem for interaction and renders mixed ARIA state and a minus indicator for indeterminate values. The UI has no Radix dependencies. Keep the presentational Card, Badge, Skeleton and SVG icons, and the app-specific PWA and account components, in their current roles.
