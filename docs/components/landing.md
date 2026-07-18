# src/components/landing/

## Purpose
Marketing/landing-page sections, rendered only from the root `src/app/page.tsx` (the
logged-out landing page). Not used anywhere in the authenticated app.

## Key files
| File | Role |
|---|---|
| `LandingHero.tsx` | h1 headline + `GoogleSignInForm` + a decorative `Waveform` (from `components/listening/`). |
| `HowItWorks.tsx` | 4-step `Card` grid explaining the product. |
| `CommandShowcase.tsx` | Renders 4 `Chip` badges (SKIP/ARCHIVE/REPLY/SNOOZE) to preview the voice commands. |
| `GoogleSignInForm.tsx` | Form wrapping `ui/Button` + `IconGoogle`, calls `signIn` from `src/lib/auth/options`. Used by both `LandingHero` and `ClosingCta`. |
| `ClosingCta.tsx` | Bottom-of-page card, wraps `GoogleSignInForm` again. |

## Depends on
- `src/components/ui/` (`Card`, `Chip`, `Button`, icons).
- `src/components/listening/Waveform` (the one cross-feature-directory import in the codebase, used purely decoratively).
- `src/lib/auth/options` (`signIn`) — via `GoogleSignInForm`.

## Depended on by
- `src/app/page.tsx` only — renders `LandingHero`, `HowItWorks`, `CommandShowcase`, `ClosingCta` in sequence.

## Where to add new code here
- A new landing-page section → add here, compose from `ui/` primitives.
- Anything that needs to run once the user is authenticated does not belong here — landing components are logged-out only, by convention (none of them read session state).
