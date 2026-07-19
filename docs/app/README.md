# src/app/ — App Router shell

## Purpose
The root Next.js App Router files: global layout, the logged-out landing page, PWA
manifest/sitemap, and global CSS. All four authenticated pages live under the `(authenticated)/`
route group (see below) and API routes in [api/README.md](./api/README.md). The static,
unauthenticated `tos/` and `privacy/` pages live alongside them.

## Key files
| File | Role |
|---|---|
| `layout.tsx` (65 lines) | Root layout — fonts (Atkinson Hyperlegible Next, Fraunces), `metadata`/`viewport` exports, mounts `ThemeScript` and `ServiceWorkerRegister` once for the whole app. |
| `(authenticated)/layout.tsx` | Shared layout for every authenticated page — the single `auth()` redirect gate (individual pages no longer each re-check it), wraps children in shadcn's `SidebarProvider` + `AppSidebar` + `SidebarInset`, and renders an always-visible `SidebarTrigger` bar above `children` (opens the mobile drawer below the tablet breakpoint, toggles icon-only collapse above it). A route group (parens don't affect the URL), so `(authenticated)/home/page.tsx` still serves `/home` — see [home.md](./home.md), [listen.md](./listen.md), [inbox.md](./inbox.md), [settings.md](./settings.md). |
| `page.tsx` (24 lines) | Logged-out landing page — redirects to `/home` if already authenticated (checks `auth()` from `src/lib/auth/options`), otherwise renders `LandingNav`, `LandingHero`, `HowItWorks`, `CommandShowcase`, `ClosingCta` from `src/components/landing/`. |
| `tos/page.tsx` | Static Terms of Service page, no auth check, linked from `GoogleSignInForm`. |
| `privacy/page.tsx` | Static Privacy Policy page, no auth check, linked from `GoogleSignInForm`. Required for Google OAuth verification — explicitly discloses Gmail API data usage. |
| `onboarding/page.tsx` + `onboarding/OnboardingClient.tsx` | Deferred-gate onboarding flow (outside the `(authenticated)` route group, like tos/privacy). Shown to users out of free-trial actions and without a personal OpenAI key. Server page redirects to `/` if not signed in; client component renders a password input for the API key with save/error states. On success, redirects to `/home`. Calls `POST /api/settings/openai-key` to store the key. |
| `globals.css` | CSS variables for light/dark theme, Tailwind theme config (including the landing-only `--text-hero` token, kept separate from the in-product `--text-display`), the named animations (`waveform`, `pulse-ring`, `bounce-dot`, `scale-pop`, `shake`) that back the listening-state visuals in `src/components/listening/`, and the shadcn `--sidebar*`/`--background`/`--foreground`/etc. tokens mapped onto this app's BRAND palette rather than left as shadcn's zinc defaults. |
| `manifest.ts` | PWA manifest metadata (Next's typed `MetadataRoute.Manifest` export). |
| `sitemap.ts` | Sitemap export, base URL `mail.harryt.dev`. |

## Depends on
- `src/lib/auth/options` (`auth`) — `page.tsx`'s and `(authenticated)/layout.tsx`'s redirect checks.
- `src/components/ui/{ThemeScript,ServiceWorkerRegister}` — `layout.tsx`.
- `src/components/ui/AppSidebar` — `(authenticated)/layout.tsx`.
- `src/components/landing/*` — `page.tsx`.

## Where to add new code here
- A new global animation/CSS variable used across the listening UI → `globals.css`, alongside the existing named keyframes.
- A new top-level metadata export (robots.txt, PWA icons, etc.) → follow the `manifest.ts`/`sitemap.ts` pattern (a typed default-export function).
- A new authenticated page → add a subdirectory under `(authenticated)/`, add its link to `NAV_ITEMS` in `src/components/ui/AppSidebar.tsx`, and add its path to `PROTECTED_PREFIXES`/`config.matcher` in `proxy.ts`. It gets the auth gate and sidebar for free from the route group layout — don't re-check `auth()` for redirect purposes or render a header in the page itself.
- Do not add page-specific logic to the root `layout.tsx` or `page.tsx` beyond what's already there.
