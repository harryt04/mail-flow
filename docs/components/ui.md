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
| `Badge.tsx` | Tone-based badge/label (`brand`/`positive`/`attention`/`danger`/`neutral`). |
| `AppSidebar.tsx` | Client component; the app's persistent nav (Home/Listen/Inbox/Settings) built on the shadcn `sidebar.tsx` primitives. Highlights the active page via `usePathname()`. `collapsible="icon"` — collapses to an icon-only rail (via the header's `SidebarTrigger`, the `SidebarRail` edge/drag target, or the `Cmd/Ctrl+B` shortcut baked into `sidebar.tsx`), with each nav item's label surfaced as a `Tooltip` while collapsed. Footer contains a profile menu (avatar + dropdown with Settings/Sign out) built on `avatar.tsx` and `dropdown-menu.tsx`, populated with the current user's name, email, and avatar via `useSession()` from `next-auth/react`. Rendered once, from `src/app/(authenticated)/layout.tsx`. |
| `sidebar.tsx`, `sheet.tsx`, `tooltip.tsx`, `separator.tsx`, `skeleton.tsx`, `input.tsx`, `avatar.tsx`, `dropdown-menu.tsx` | Unmodified shadcn primitives (added via `pnpm dlx shadcn add <component>`) — `Sheet` powers the mobile drawer, `Tooltip` labels collapsed-icon nav items, `Avatar` displays the current user's image/initials in the profile menu, `DropdownMenu` powers the profile menu's Settings/Sign out options. Don't hand-edit; re-run the shadcn CLI to update. |
| `ServiceWorkerRegister.tsx` | Client-side PWA service worker registration (registers `public/sw.js`); renders `null`. |
| `ThemeScript.tsx` | Inline theme-persistence script injected in `<head>` to prevent flash-of-unstyled-content before React hydrates. |
| `icons.tsx` | Inline SVG icon components scoped to the listening UI's icon+color+label vocabulary (BRAND.md §6) — `IconMic`, `IconCheck`, `IconAlert`, `IconSkip`, `IconArchive`, `IconReply`, `IconSnooze`, `IconPlay`, `IconPause`, `IconDots`, `IconFolder`, `IconGoogle`. Generic nav icons (Home/Inbox/Settings/etc.) come from `lucide-react` instead — see `AppSidebar.tsx`. |

## Depends on
- `react` (types only: `ReactNode`, `HTMLAttributes`, `ButtonHTMLAttributes`, `SVGProps`) and `next/link`/`next/navigation` (`AppSidebar` only).
- `AppSidebar.tsx` reaches into `src/lib/auth/actions` (`signOutAction`, a `'use server'` function) — every other file here has zero internal imports.
- The shadcn primitives (`sidebar.tsx` etc.) depend on `lucide-react` and `src/hooks/use-mobile.ts`; their CSS tokens (`--sidebar*`, `--background`, `--foreground`, etc.) are mapped onto this app's BRAND palette in `src/app/globals.css` rather than left as shadcn's defaults.

## Depended on by
Nearly everything: `AppSidebar` is rendered once by `src/app/(authenticated)/layout.tsx`, which wraps `home`, `listen`, `inbox`, and `settings`; `Button`/`Card`/`IconButton`/`Badge` are used across `app/`, `components/listening/`, `components/landing/`, and `components/settings/`. `ServiceWorkerRegister` and `ThemeScript` are both mounted once, from `src/app/layout.tsx`.

## Conventions
- These components accept and spread standard HTML attribute types (`ButtonHTMLAttributes<HTMLButtonElement>`, etc.) rather than defining a closed prop set — keep new primitives consistent with that so callers can pass `onClick`, `type`, `aria-*`, etc. through untouched.
- Icons for the listening UI are inline SVG components in `icons.tsx`, not an icon font or external package — new ones follow the existing `Icon<Name>(props: IconProps)` pattern there. Generic app-chrome icons (nav, actions outside the listening screen) use `lucide-react` instead, per the shadcn setup in `components.json`.
- `Button.tsx` has an `icon` size (44px square) for icon-only controls like the sidebar's mobile trigger — added to match BRAND.md §5's 44px minimum touch target rather than shadcn's default 36px.

## Where to add new code here
- A new generic primitive used by 2+ feature areas → add here, keep it free of business logic and feature-specific imports. Prefer pulling from shadcn (`pnpm dlx shadcn add <component>`) over hand-rolling one, consistent with `sidebar.tsx`/`sheet.tsx`/etc.
- A new listening-UI icon → add to `icons.tsx` following the existing `IconProps` signature; a new generic nav/chrome icon → import from `lucide-react` instead.
- Do not add anything here that imports from `src/lib/gmail`, `src/lib/bookmark`, or fetches data — that breaks the "generic, reusable" contract this directory exists for. `AppSidebar`'s `signOutAction` import is the sole, deliberate exception.
