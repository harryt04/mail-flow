# src/components/ — overview

Four subdirectories, split by scope:

- [ui.md](./ui.md) — generic, app-agnostic design-system primitives (Button, Card, Badge, icons, etc.). No business logic, minimal internal imports.
- [landing.md](./landing.md) — marketing/landing-page-only sections, rendered from `src/app/page.tsx`.
- [listening.md](./listening.md) — the voice-session status UI, rendered from `src/app/listen/ListenClient.tsx`.
- [settings.md](./settings.md) — `ToggleGroup`, the one settings-specific control.

## Conventions
- Naming: PascalCase component files matching their default export (`Button.tsx` exports `Button`).
- Props types are named `<Component>Props` and exported alongside the component (e.g. `ButtonProps`, `ManualControlsProps`).
- Styling is Tailwind utility classes inline in JSX — no CSS modules or styled-components. Visual language (colors, motion rules) follows `mvp-docs/BRAND.md`; several components have comments citing specific BRAND.md sections (e.g. `Waveform.tsx` is the one exception to BRAND.md §7's "no bounce" rule) — check that file before changing animation/color behavior.
- Feature-specific components (`listening/`, `settings/`) import from `ui/` for primitives; `ui/` never imports from a feature directory. `landing/` also only imports from `ui/` and `listening/` (for `Waveform`).

## Where to add new code here
- A new generic, reusable primitive (used in 2+ feature areas) → `ui/`.
- A new component specific to the listening screen → `listening/`.
- A new component specific to settings → `settings/`.
- A new marketing/landing section → `landing/`.
- If a component doesn't clearly belong to one feature area and isn't generic enough for `ui/`, prefer adding it to the feature directory of its primary consumer rather than creating a new top-level components subdirectory.
