---
name: marcd-design-system
description: The Marc'd visual system for the Cartez Dewberry website — a creative-studio sketchbook on cream paper, inked in brand black with a red marker. Covers tokens, Bricolage/Inter/Roboto Mono type, surfaces, sticky-note cards, the floating pill nav, red-marker headline highlights, sketch doodles, motion, and conversion patterns. Use when editing any CSS or JSX under frontend/src, adding or restyling a section or component, choosing colors, type, spacing, imagery or animation, or when the user mentions look, feel, brand, design, layout, character, animation, or converting visitors into clients.
---

# Marc'd design system

> Creative-studio sketchbook on cream paper. Black ink does the structure, red marks what matters.

The site sells a one-person studio to small-business owners. It must read **masculine but welcoming**: confident, direct, hand-made, never corporate and never cute. Every visual decision serves one goal: **turn a visitor into a client.**

The system is adapted from the Say Briefly style (cream paper, chunky tracked display type, marker highlights, sticky-note cards, sketch doodles), rebuilt in the owner's brand black and red. The mapping lives in [tokens.md](tokens.md).

## The five rules that matter most

1. **Never hardcode a color.** Use the tokens in `frontend/src/styles/tokens.css`. The audit enforces it.
2. **Black is structure, red is action and emphasis.** Ink (`--ink`) for text, borders and outlines. Red (`--red`) for the primary CTA, the marker highlight, and small marks such as label rules, checks and numerals. Never introduce a third brand color.
3. **One marker word per heading.** Wrap a single word of a display heading in `<em>`. It renders as cream text on a red highlighter wash and wipes in on reveal. Two marker words is shouting.
4. **Bricolage is display only, 40px and up.** h1/h2, big numerals, sign-off lines. h3 and below, UI, buttons and body are Inter. Labels and tags are Roboto Mono. The audit warns on display type under 40px.
5. **No two adjacent sections share a surface.** Rotate paper → deep → black. Black bands are punctuation (ticker, Process, closing CTA, intake), never adjacent.

## Surfaces

| Surface | Class | Background | Use for |
|---|---|---|---|
| Cream paper | `surface--paper` | `--paper` `#fcfaf5` | Default reading sections |
| Deep paper | `surface--deep` | `--paper-deep` `#f4efe6` | Alternating band (Services, FAQ) |
| Black | `surface--espresso` | `--espresso` `#121110` | One dramatic moment per ~3 sections |
| Light card | `surface--light` | `--card` | Forms placed on a black band |

`surface--espresso` remaps `--ink`, `--ink-soft`, `--paper` and friends, so children invert automatically. Don't hand-write on-dark colors on its children; use `--red-on-dark` for small red marks that need 4.5:1 on black. (The class keeps its historical name; the value is now true black.)

All surfaces carry the paper grain (`--grain`) as a background layer, never as an overlay.

## Type

| Role | Family | Token | Notes |
|---|---|---|---|
| Display (h1, h2, sign-off, price, step numerals) | Bricolage Grotesque Variable 800 | `--display` | `letter-spacing: var(--tracking-display)` (positive), line-height 1.0–1.05 |
| Everything functional (body, h3/h4, nav, buttons, forms) | Inter Variable 400–700 | `--body` | Body 17–18px / 1.6; h3 Inter 700 |
| Labels, tags, metadata | Roboto Mono 400 | `--mono` | Uppercase, 0.08–0.12em tracking, 11–13px |
| C/D logo only | Fraunces Variable | `--logo` | The brand mark. Never change it, never use Fraunces elsewhere |

## Components at a glance

Full specs live in [components.md](components.md).

- **Floating pill nav.** 16px radius, pencil border, cream background, red-tinted glow, tightens on scroll.
- **Buttons.** `.button--red` is the primary CTA. `.button--outline` is secondary. `.button--note` is a soft path. Add `.button--lg` on hero and closing CTAs. 6px radius.
- **Tagline badge** (`.badge`) above the hero headline.
- **Mono section label** (`.section-label`) with a short red rule.
- **Sticky-note card** (`.note-card` plus `--sand`, `--sage`, `--steel` or `--clay`). Flat fill with a 1px ink edge and an optional hard offset shadow.
- **Mono tag** (`.tag`).
- **Reassurance caption** (`.reassurance`) under the primary CTA.
- **Sketch doodles** (`<Sketch variant="arrow|squiggle|underline|circle|star|spark">`). Monoline, decorative, aria-hidden.
- **Mobile sticky CTA** (`<MobileCTA>`). Phones only; hides near the forms.

## Conversion rules

- **Every viewport has one obvious next step.** The hero, the Work CTA card, the featured price plan, the FAQ, the closing CTA, the footer sign-off and the mobile sticky CTA all point to *Plan your website* or *Book a free call*.
- **Exactly one red-filled button per view.** Secondary actions use `.button--outline`.
- **Put a reassurance line under big asks.** Use facts that already appear on the site: free 30-minute consultation, clear scope before work begins, starting prices.
- **Reduce anxiety near prices.** The featured plan is the visual default; other plans use outline CTAs.

## Do

- Keep the page ~90% cream and black. Earth-tone notes and red are seasoning.
- Separate layers with fills and 1px ink or pencil borders, not soft shadows. The hard offset shadow (`--lift-offset`) is the only "lift" with character.
- Use 6px radius for buttons, 12px for cards, 16px for the nav and large panels, and a pill for tags.
- Left-align reading copy and cap it at `--measure`.
- Keep the About section's original portrait card and slate `--about-*` palette. The owner asked for that exception.

## Don't

- Don't set Bricolage below 40px, and don't set body copy in it.
- Don't put two sticky-note colors side by side in the same row.
- Don't use pure black `#000` for text, or pure white for page backgrounds.
- Don't use blurry drop shadows over 3px blur on cards.
- Don't make red a background for large surfaces; it's a marker and a button, not a band.
- Don't add scroll listeners or new reveal observers. See [motion.md](motion.md).

## Before you finish

1. `node .agents/skills/design-review/scripts/audit.mjs` must have zero errors. Treat warnings as decisions.
2. `npm --prefix frontend test` and `npm --prefix frontend run build` must pass.
3. Do a visual check at 390, 760 and 1280px with no horizontal scroll (see the `design-review` skill).
4. Check with `prefers-reduced-motion: reduce`: everything is visible, markers and doodles are fully drawn.

## Reference

- Tokens and the Say Briefly → Marc'd mapping: [tokens.md](tokens.md)
- Component specs: [components.md](components.md)
- Motion and character: [motion.md](motion.md)
- Copy voice and conversion microcopy: [voice.md](voice.md)
