# MailFlow — Design Language & Brand Guide

*Companion to [PRD.md](./PRD.md). This document defines the visual and verbal identity for MailFlow's MVP.*

---

## 1. Brand Essence

**MailFlow is the audiobook app for your inbox.** It should feel like the emotional opposite of email: calm, unhurried, forgiving, human. The primary user is someone drowning in unread mail who has given up on the inbox as a UI — they want to close their eyes, listen, and say a word.

| We are | We are not |
|---|---|
| Calm, unhurried, warm | Urgent, red-alert, gamified |
| Plain-spoken, human | Corporate, jargon-heavy |
| Forgiving of mistakes ("redo" is always one word away) | Punishing, permanent, high-stakes |
| Quiet confidence | Loud, flashy, notification-heavy |

**Design priorities, in order:** legibility → calm → warmth → polish. If a decision trades polish for clarity, take the clarity every time — the primary user is not a designer's target demo, she's someone's mother trying to get through 900 unread emails.

### Why this matters for every decision below

Two constraints override normal app-design defaults and should be treated as first-class requirements, not accessibility add-ons:

1. **The screen is often off.** This is voice-first software. The visual UI is a *fallback and confirmation surface*, not the primary channel. Every state that matters must also be legible through audio (TTS phrasing, earcons) and, where possible, haptic feedback — never encode meaning in a way that only the screen can express.
2. **You are colorblind, and so are some real users.** Every semantic use of color in this system is chosen to survive protanopia, deuteranopia, and tritanopia, and is never the *only* signal for a state — shape, icon, position, and text label always carry the meaning redundantly.

---

## 2. Aesthetic Direction: Calm Functionalism (Scandinavian-leaning)

Warmth plus restraint. Rounded, approachable, generous whitespace, no pure black, no harsh shadows, no decorative motion. One accent does the talking; everything else recedes so the *content* (the email being read, the current command state) stays the visual lead.

Explicitly avoided: purple-gradient SaaS aesthetic, glassmorphism, dense dashboards, red/green as meaningful opposites, small tap targets, decorative icon sets, anything that asks the user to read fine print.

---

## 3. Color System

### 3.1 Why this palette

Standard UI palettes lean on red = bad / green = good. That pairing is the single worst choice for colorblindness — it's illegible to the ~8% of men (and ~0.5% of women) with red-green color vision deficiency, which is the most common form. Instead this system uses four hues adapted from the **Okabe–Ito palette**, the standard reference for categorical color that's designed from the ground up to stay distinguishable under protanopia, deuteranopia, and tritanopia:

- **Harbor Blue** — primary brand color, calm, trustworthy, used for the main action and identity
- **Tide Teal** — positive / completed states (archived, sent, done) — a blue-shifted green, not a pure green, so it stays distinct from blue for red-green-deficient eyes
- **Amber** — attention / in-progress / needs-input states (listening, dictating, snooze)
- **Vermillion** — errors / destructive-adjacent states only — a red-orange, not pure red, which stays distinguishable from Tide Teal where pure red would not

No two of these four hues are the pair most commonly confused by any form of CVD. That said: **color is always the third signal, never the first or second.** Every status in the UI pairs color with (1) an icon/shape and (2) a text label or spoken phrase. Treat any component that uses color alone as a bug.

### 3.2 Palette

#### Light theme

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAF7F1` | App background — warm paper, not stark white |
| `--surface` | `#FFFFFF` | Cards, sheets, the playback panel |
| `--surface-sunken` | `#F1ECE3` | Recessed areas, input fields at rest |
| `--border` | `#E3DCCF` | Hairline dividers |
| `--text-primary` | `#221F1A` | Body/headline text — warm near-black, not pure `#000` |
| `--text-secondary` | `#635C4F` | Metadata: sender, timestamps |
| `--text-muted` | `#948C7B` | Disabled, placeholder |
| `--brand` (Harbor Blue) | `#0B6E8F` | Primary actions, links, brand mark, active state |
| `--brand-strong` | `#08536C` | Pressed/hover state of brand |
| `--positive` (Tide Teal) | `#00786A` | Archived / sent / done confirmations |
| `--attention` (Amber) | `#B4670A` | Listening / recording / snooze / in-progress |
| `--danger` (Vermillion) | `#AE3B1C` | Errors, disconnect account, permanent actions |
| `--focus-ring` | `#0B6E8F` at 55% opacity, 3px | Keyboard/voice-focus outline |

#### Dark theme

Not an inversion — dark backgrounds are a warm-neutral charcoal (matching the paper warmth of light mode) and every accent is re-lightened to hold WCAG AA contrast on that charcoal, since a straight hex-invert reliably breaks contrast and desaturates exactly the hues colorblind users depend on most.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#17140F` | App background |
| `--surface` | `#211D17` | Cards, sheets, the playback panel |
| `--surface-sunken` | `#0F0D0A` | Recessed areas |
| `--border` | `#3A342A` | Hairline dividers |
| `--text-primary` | `#F2EEE5` | Body/headline text — off-white, never pure `#FFF` |
| `--text-secondary` | `#C4BCA9` | Metadata |
| `--text-muted` | `#7F7666` | Disabled, placeholder |
| `--brand` (Harbor Blue) | `#5FC1E8` | Primary actions, brand mark, active state |
| `--brand-strong` | `#8AD4F2` | Pressed/hover state of brand |
| `--positive` (Tide Teal) | `#3FD9BE` | Archived / sent / done |
| `--attention` (Amber) | `#F0A94B` | Listening / recording / in-progress |
| `--danger` (Vermillion) | `#F1815C` | Errors, destructive-adjacent |
| `--focus-ring` | `#5FC1E8` at 55% opacity, 3px | Keyboard/voice-focus outline |

### 3.3 Contrast targets

- Body text on `--bg`/`--surface`: **≥ 7:1** (AAA) — the primary persona skews older; don't settle for AA minimums on anything read at length.
- Icon-only controls and secondary text: **≥ 4.5:1** minimum.
- All four semantic accents are contrast-checked against both `--bg` and `--surface` in their respective theme before use — if a future accent variant fails 4.5:1, darken/lighten it, don't ship it.

### 3.4 Rules

1. Never use `--positive` and `--danger` as the only differentiator between two adjacent controls (e.g., "Archive" vs. "delete account") — pair with distinct icons and label text every time.
2. Never introduce a fifth semantic hue without checking it against Okabe–Ito derivatives — the whole point is a closed, tested set.
3. Pure saturated red or green (`#FF0000`/`#00FF00` family) are banned outright, even for one-off illustration or marketing use.
4. System `prefers-color-scheme` drives the default theme; a manual toggle persists via `data-theme` and overrides it.

---

## 4. Typography

**Primary typeface: [Atkinson Hyperlegible Next](https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next)** (Google Fonts), used for every weight of UI text — headings, body, labels, buttons.

This is a deliberate, non-default choice: it's designed by the Braille Institute specifically to maximize legibility and character distinction for readers with low vision, which is a direct match for the primary persona (an older, non-technical user relying on the visual UI only as a fallback, often in poor lighting — walking, doing chores). It reads as friendly and humanist rather than clinical, so it doesn't need a second display face to feel warm — one family, used consistently, keeps the whole system calmer and easier to maintain.

If a marketing/landing page ever wants more editorial personality than the in-app UI needs, pair it with **Fraunces** (warm, slightly quirky serif) for large display headlines only — never in the product UI itself.

### Scale (mobile-first, `rem` based on 16px root)

| Token | Size / Line-height | Weight | Use |
|---|---|---|---|
| `--text-display` | 2.25rem / 1.15 | 700 | "Start Listening" hero, empty states |
| `--text-h1` | 1.75rem / 1.25 | 700 | Screen titles |
| `--text-h2` | 1.375rem / 1.3 | 600 | Section headers |
| `--text-body-lg` | 1.125rem / 1.6 | 400 | Sender/subject on the playback screen — read at a glance, often at arm's length |
| `--text-body` | 1rem / 1.6 | 400 | Default body text (never below 16px on mobile — prevents iOS input zoom and matches the low-vision-friendly baseline) |
| `--text-meta` | 0.875rem / 1.5 | 500 | Timestamps, secondary metadata |
| `--text-label` | 0.875rem / 1.4 | 600, uppercase, +0.02em tracking | Button labels, status chips |

No size below 14px anywhere in the product.

---

## 5. Layout & Spacing

- **8px base spacing scale**: 4, 8, 12, 16, 24, 32, 48, 64. Generous by default — this is Scandinavian, not Swiss-grid-dense.
- **Mobile-first**, single column at 375px, `min-width` breakpoints add structure upward (tablet 768px, desktop 1024px+). The playback screen never becomes multi-column — it stays a single centered focus column even on desktop, because the interaction model is audio, not scanning.
- **Corner radius**: 16px on cards/sheets, 999px (full pill) on primary action buttons and status chips — soft, approachable, no sharp edges.
- **Touch targets**: 56px minimum for primary voice-command fallback buttons (Skip/Archive/Reply/Snooze), 44px minimum elsewhere. The primary mic/listening control is 88px — this is a "can operate without looking" interface, so err large.
- **Shadows**: soft and low-opacity only (`0 8px 24px rgba(0,0,0,0.08)` light / `0 8px 24px rgba(0,0,0,0.4)` dark) — no hard drop shadows, consistent with the calm-functionalist direction.

---

## 6. The Listening State (the actual core UI)

Since the screen is usually secondary or off, the playback/listening screen is less a "screen" than a status confirmation for a session that's fundamentally audio. Every state on it must be encoded at least twice: shape/motion + color, so it degrades gracefully for colorblind users and remains legible in a glance under sunlight or motion (walking, chores).

| State | Shape / Motion | Color | Spoken/audio equivalent |
|---|---|---|---|
| Speaking (reading email) | Flowing waveform, continuous motion | `--brand` | (the TTS audio itself is the primary signal) |
| Listening (awaiting command) | Pulsing ring around mic icon | `--attention` | Short rising earcon |
| Thinking/processing | Three-dot bounce | `--text-secondary` (neutral, deliberately not a semantic color) | Short neutral earcon |
| Command recognized / action taken | Icon checkmark, brief scale-pop then settle | `--positive` | Short confirming earcon + spoken confirmation ("Archived.") |
| Not recognized / error | Icon shake (respects `prefers-reduced-motion` → no shake, just color+icon swap) | `--danger` | Spoken retry prompt, never a silent failure |

Manual fallback buttons (Skip, Archive, Reply, Snooze — per PRD §5.7) mirror these same icon+color pairs exactly, so a user who ever has to look at the screen sees the identical vocabulary they've been hearing.

---

## 7. Motion

Gentle, natural easing (`ease-out`, 200–320ms) for state changes. No bounce/overshoot on entrances — this isn't a playful brand. The one exception is the waveform during speech playback, which should feel alive and continuous, not mechanical.

`prefers-reduced-motion` must disable the waveform animation, the pulsing listening ring, and the shake-on-error — replace all three with static icon + color/label changes only, since those motion cues are decorative reinforcement, not the sole carrier of meaning.

---

## 8. Voice & Tone (written and spoken)

- **Short sentences.** Confirmations are one clause: "Archived." "Sending your reply." "Didn't catch that — try again."
- **Never blame the user.** "Didn't catch that" not "Invalid command."
- **No exclamation points, no emoji, no gamified praise** ("You crushed your inbox!"). Calm confidence, not cheerleading.
- Errors always offer the next step in the same breath: "Didn't catch that. Say Skip, Archive, or Reply."

---

## 9. Accessibility Checklist (non-negotiable for MVP)

- [ ] No UI state is communicated by color alone — always + icon/shape + label.
- [ ] All accent colors hold ≥4.5:1 contrast against both `--bg` and `--surface` in both themes (verify with an automated contrast checker before shipping any new token).
- [ ] Body text holds ≥7:1 where feasible.
- [ ] All primary voice-command fallback buttons ≥56px touch target.
- [ ] `prefers-reduced-motion` disables all decorative motion, preserves state changes via static cues.
- [ ] `prefers-color-scheme` sets default theme; manual override persists.
- [ ] Every spoken confirmation has an on-screen text equivalent and vice versa — no channel-exclusive information.

---

## 10. Open items for you

- **Logo/wordmark**: not designed here — recommend a simple wordmark in Atkinson Hyperlegible (no icon mark needed for MVP) until there's budget for a mark; happy to draft one.
- **Okabe–Ito hex values above are adapted** (warmed slightly, contrast-tuned for this specific bg) rather than used verbatim — if you want the literal canonical Okabe–Ito hexes instead, say so and I'll swap them in.
