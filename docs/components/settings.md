# src/components/settings/

## Purpose
A single reusable control (`ToggleGroup`) used for every settings choice.

## Key files
| File | Role |
|---|---|
| `ToggleGroup.tsx` | Generic `<T extends string>` segmented control: `{ value, options, onChange, disabled }`. Wraps `ui/Button` for each option. |

## Depends on
- `src/components/ui/Button.tsx`.

## Depended on by
- `src/app/settings/SettingsClient.tsx` — renders `ToggleGroup` three times, for `InboxScope`, `InboxOrder`, and `ThemePreference` (types from [docs/lib/README.md](../lib/README.md) / `src/lib/types.ts` and `useTheme`).

## Where to add new code here
- A new settings toggle (e.g. a new `T extends string` option set) → reuse `ToggleGroup` directly from `SettingsClient.tsx`, no new component needed — that's the point of its generic design.
- A settings control that isn't a simple mutually-exclusive toggle (e.g. free text, a slider) → add a new component here, don't force it into `ToggleGroup`.
