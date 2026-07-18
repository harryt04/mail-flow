# src/components/ui/

## Purpose
Generic, app-agnostic design-system primitives. No business logic, no feature-specific
imports — everything here can be used from any feature area.

## Key files
| File | Role |
|---|---|
| `Button.tsx` | Variant-driven button (`primary`/`secondary`/`danger`/`ghost`, `md`/`lg`, optional icon, `fullWidth`). The base of nearly every clickable element in the app. |
| `IconButton.tsx` | Accessible icon-only button, requires `icon` + `label` (for a11y), `default`/`primary` variant. |
| `Card.tsx` | Rounded container with border and shadow — generic content wrapper. |
| `Chip.tsx` | Tone-based badge/label (`brand`/`positive`/`attention`/`danger`/`neutral`). |
| `AppHeader.tsx` | Server component; app header with a sign-out form (calls `signOut` from `src/lib/auth/options`). Rendered on every authenticated page. |
| `ServiceWorkerRegister.tsx` | Client-side PWA service worker registration (registers `public/sw.js`); renders `null`. |
| `ThemeScript.tsx` | Inline theme-persistence script injected in `<head>` to prevent flash-of-unstyled-content before React hydrates. |
| `icons.tsx` | 10 inline SVG icon components (`IconMic`, `IconCheck`, `IconAlert`, `IconSkip`, `IconArchive`, `IconReply`, `IconSnooze`, `IconPlay`, `IconPause`, `IconDots`, `IconGoogle`). |

## Depends on
- `react` (types only: `ReactNode`, `HTMLAttributes`, `ButtonHTMLAttributes`, `SVGProps`) and `next/link` (`AppHeader` only).
- `AppHeader.tsx` is the one exception that reaches into `src/lib/auth/options` (`signOut`) — every other file here has zero internal imports.

## Depended on by
Nearly everything: `AppHeader` is used on `home`, `settings`, and `listen` pages; `Button`/`Card`/`IconButton`/`Chip` are used across `app/`, `components/listening/`, `components/landing/`, and `components/settings/`. `ServiceWorkerRegister` and `ThemeScript` are both mounted once, from `src/app/layout.tsx`.

## Conventions
- These components accept and spread standard HTML attribute types (`ButtonHTMLAttributes<HTMLButtonElement>`, etc.) rather than defining a closed prop set — keep new primitives consistent with that so callers can pass `onClick`, `type`, `aria-*`, etc. through untouched.
- Icons are inline SVG components, not an icon font or external icon package — new icons follow the `Icon<Name>(props: IconProps)` pattern in `icons.tsx`.

## Where to add new code here
- A new generic primitive used by 2+ feature areas (e.g. a Modal, a Tooltip) → add here, keep it free of business logic and feature-specific imports.
- A new icon → add to `icons.tsx` following the existing `IconProps` signature; don't create one-off icon files.
- Do not add anything here that imports from `src/lib/gmail`, `src/lib/bookmark`, or fetches data — that breaks the "generic, reusable" contract this directory exists for. `AppHeader`'s `signOut` import is the sole, deliberate exception.
