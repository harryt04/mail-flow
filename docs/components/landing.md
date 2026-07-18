# src/components/landing/

## Purpose
Marketing/landing-page sections, rendered only from the root `src/app/page.tsx` (the
logged-out landing page). Not used anywhere in the authenticated app.

## Key files
| File | Role |
|---|---|
| `LandingNav.tsx` | Non-sticky header with the MailFlow text wordmark only (BRAND.md §10 — no icon mark yet). |
| `LandingHero.tsx` | h1 headline (uses the landing-only `text-hero` token above `md:`) + `GoogleSignInForm` + a decorative `Waveform` (from `components/listening/`). |
| `HowItWorks.tsx` | 4-step `Card` grid explaining the product. |
| `CommandShowcase.tsx` | Renders a small Speaking/Listening state preview (mic icon + pulsing ring, reusing BRAND.md §6's exact color/motion vocabulary) plus 4 `Badge` command pills (Skip/Archive/Reply/Snooze). |
| `GoogleSignInForm.tsx` | Form wrapping `ui/Button` + `IconGoogle`, calls `signIn` from `src/lib/auth/options`. Used by both `LandingHero` and `ClosingCta`. |
| `ClosingCta.tsx` | Bottom-of-page card, wraps `GoogleSignInForm` again. |

## Depends on
- `src/components/ui/` (`Card`, `Badge`, `Button`, icons).
- `src/components/listening/Waveform` (the one cross-feature-directory import in the codebase, used purely decoratively).
- `src/lib/auth/options` (`signIn`) — via `GoogleSignInForm`.

## Depended on by
- `src/app/page.tsx` only — renders `LandingNav`, `LandingHero`, `HowItWorks`, `CommandShowcase`, `ClosingCta` in sequence.

## Where to add new code here
- A new landing-page section → add here, compose from `ui/` primitives.
- Anything that needs to run once the user is authenticated does not belong here — landing components are logged-out only, by convention (none of them read session state).
