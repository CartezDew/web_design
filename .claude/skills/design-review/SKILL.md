---
name: design-review
description: Audits and visually verifies design changes on the Cartez Dewberry website against the marcd-design-system skill — checks for hardcoded colors, cool-grey values, adjacent duplicate section surfaces, missing reduced-motion guards, and verifies rendering at mobile, tablet, and desktop widths. Use after any CSS or layout change, before committing visual work, or when the user asks to review, verify, or check the design.
---

# Design review

Two passes: an automated audit, then a visual check. Both are required before calling visual work done — CSS has no type checker, so these are the only real feedback loops.

## Pass 1: automated audit

```bash
node .agents/skills/design-review/scripts/audit.mjs
```

It reports errors (must fix) and warnings (judgment call), and exits non-zero on errors. It checks:

- **Hardcoded colors** in `src/styles` and `src/sections`, which bypass the token system
- **Cool-grey values** anywhere, which clash with the warm palette (the Tailwind slate family is the usual culprit)
- **Pure white backgrounds**, which should be `--paper`
- **Adjacent duplicate surfaces** in the home route, the specific flatness that triggered the redesign
- **Grain overlays missing `pointer-events: none`**, which silently swallow clicks
- **Hover transforms with no `prefers-reduced-motion` guard**
- **Display font (Bricolage) set below 40px** (warning; fixed px/rem sizes only)

Fix every error. For warnings, decide deliberately rather than ignoring them by default.

## Pass 2: visual check

Build and preview, because the dev server does not exercise prerendering:

```bash
cd frontend && npm run build && node scripts/preview.mjs
```

Use `npm run build`, never bare `react-router build` — the latter skips `scripts/search-files.mjs`, so `404.html` is never written and the preview server crashes on any missing asset.

Then check these widths, which are the project's real breakpoints:

| Width | What to confirm |
|---|---|
| 390px | No horizontal scroll, type still hierarchical, nav pill and mobile sticky CTA clear of back-to-top, tap targets ≥44px |
| 760px | Grid collapse points land cleanly, no orphaned single-column cards |
| 1280px | Intended composition, section rhythm visibly alternating |

At every width, confirm there is no horizontal overflow:

```js
document.documentElement.scrollWidth <= window.innerWidth
```

This site has regressed on mobile horizontal panning before, caused by the ticker track and wide grid children, so treat it as a standing check rather than a one-time fix.

## Reduced motion

Verify with `prefers-reduced-motion: reduce` emulated. Content must be fully visible and readable — reveals must not leave elements stuck at `opacity: 0`. The gate lives in `frontend/src/motion.js`.

## What to look for beyond the checks

The audit catches mechanical problems. These need your eye:

- Does any section read as flat? Usually means equal padding, equal background, and equal type scale as its neighbor.
- Does every heading carry at most one red marker word, and does it wipe in on reveal?
- Are sticky-note colors separated, never two colored notes side by side?
- Does the headshot still feel like the anchor of the page, or has it been crowded out?
- Is there exactly one red primary action in view, or has red leaked onto secondary buttons?
