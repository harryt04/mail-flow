# src/app/ — App Router shell

## Purpose
The root Next.js App Router files: global layout, the logged-out landing page, PWA
manifest/sitemap, and global CSS. Page-specific logic lives in the `home/`, `listen/`, and
`settings/` subdirectories (see [home.md](./home.md), [listen.md](./listen.md),
[settings.md](./settings.md)) and API routes in [api/README.md](./api/README.md).

## Key files
| File | Role |
|---|---|
| `layout.tsx` (65 lines) | Root layout — fonts (Atkinson Hyperlegible Next, Fraunces), `metadata`/`viewport` exports, mounts `ThemeScript` and `ServiceWorkerRegister` once for the whole app. |
| `page.tsx` (24 lines) | Logged-out landing page — redirects to `/home` if already authenticated (checks `auth()` from `src/lib/auth/options`), otherwise renders `LandingNav`, `LandingHero`, `HowItWorks`, `CommandShowcase`, `ClosingCta` from `src/components/landing/`. |
| `globals.css` (224 lines) | CSS variables for light/dark theme, Tailwind theme config (including the landing-only `--text-hero` token, kept separate from the in-product `--text-display`), and the named animations (`waveform`, `pulse-ring`, `bounce-dot`, `scale-pop`, `shake`) that back the listening-state visuals in `src/components/listening/`. |
| `manifest.ts` | PWA manifest metadata (Next's typed `MetadataRoute.Manifest` export). |
| `sitemap.ts` | Sitemap export, base URL `mail.harryt.dev`. |

## Depends on
- `src/lib/auth/options` (`auth`) — `page.tsx`'s redirect check.
- `src/components/ui/{ThemeScript,ServiceWorkerRegister}` — `layout.tsx`.
- `src/components/landing/*` — `page.tsx`.

## Where to add new code here
- A new global animation/CSS variable used across the listening UI → `globals.css`, alongside the existing named keyframes.
- A new top-level metadata export (robots.txt, PWA icons, etc.) → follow the `manifest.ts`/`sitemap.ts` pattern (a typed default-export function).
- Do not add page-specific logic to `layout.tsx` or `page.tsx` beyond what's already there — new authenticated pages go in their own subdirectory (see `home/`, `listen/`, `settings/`).
