---
name: editorial-design-system
description: The editorial-and-human visual system for the Cartez Dewberry website — warm paper palette, Fraunces serif display, section rhythm, portrait treatment, texture, and motion. Use when editing any CSS or JSX under frontend/src, adding or restyling a section or component, choosing colors, type, spacing, or imagery, or when the user mentions look, feel, design, layout, branding, or that the site feels bland or minimal.
---

# Editorial design system

The site sells a one-person studio. The design has to feel like a person made it, not a template. Every decision serves one goal: **warmth and authority at the same time.**

## The three rules that matter most

1. **Never hardcode a color.** Use the tokens in `frontend/src/styles/tokens.css`. The site previously had 235 hardcoded hex values across 25 CSS files, which is why it drifted grey and flat.
2. **No two adjacent sections share a surface.** Rotate through the four surfaces below. Sameness is what made the site read as bland.
3. **Warm, never cool.** Neutrals are brown-grey, never blue-grey. Shadows are warm brown, never black or slate. If a value looks like Tailwind's slate palette, it is wrong.

## Surfaces

Every section picks exactly one, and it must differ from its neighbors.

| Surface | Class | Background | Text | Use for |
|---|---|---|---|---|
| Paper | `surface--paper` | `--paper` | `--ink` | Default reading sections |
| Deep paper | `surface--deep` | `--paper-deep` | `--ink` | Alternating band, cards, pricing |
| Espresso | `surface--espresso` | `--espresso` | `--paper` | One or two dramatic moments per page |
| Feature | `surface--feature` | image or portrait-led | varies | About, testimonial, closing CTA |

Espresso is punctuation, not a background. Keep dark bands non-adjacent and no denser than roughly one per three sections — on the twelve-section home page that means the ticker, Process, and the closing CTA.

Forms and other dense controls must never sit directly on espresso. Wrap them in `surface--light`, a white card that restores the light tokens, so inputs stay dark text on a light field. The project intake form is the reference example.

Espresso remaps the ink tokens on itself, so `--ink`, `--ink-soft`, `--ink-faint`, and `--ochre` all invert automatically. Never hand-write `color: var(--on-dark)` on children of an espresso section; it duplicates what the surface already does and drifts the moment the palette changes.

## Type

Two families, each with one job. Never use the serif for UI or the sans for display.

- **Fraunces Variable** (`--display`) — all headings, pull quotes, and large numerals. It carries the personality.
- **Inter Variable** (`--body`) — body copy, labels, buttons, forms, navigation.

Serif display needs far less negative tracking than sans. Use `letter-spacing: -0.02em` on headings, never the `-0.055em` that suited the old geometric sans.

The project imports Fraunces's **optical-size subset** (`@fontsource-variable/fraunces/opsz.css`, 66KB latin). Always set `font-optical-sizing: auto` on display type — that axis is the whole reason this subset was chosen, and it raises stroke contrast and sharpens serifs as type gets larger, which is what produces the editorial feel. Do not switch to `full.css` for the SOFT or WONK axes; it nearly doubles the font payload on a site where mobile LCP affects search ranking.

Body copy is larger than typical SaaS: `--text-body` is 17px and `--text-lead` scales to 21px. Editorial layouts earn trust through comfortable reading, not dense UI text.

## Texture

Flat fills are the enemy. Every paper surface carries grain as a second background layer:

```css
.surface--paper {
  background-color: var(--paper);
  background-image: var(--grain);
}
```

The grain is a desaturated inline SVG `feTurbulence` in `--grain`, with its opacity baked into the SVG. It is nearly invisible per-pixel and does all the work of making the page feel printed rather than rendered.

Apply it as a `background-image`, not a `::before` overlay. An overlay has to be stacked above the section background but below its content, and it swallows clicks unless it gets `pointer-events: none` — two bugs the background-layer approach cannot have.

## Portraits and imagery

There is one real photo of Cartez, `frontend/assets/headshot.webp`. It carries the entire human quality of the site, so give it room.

- The About section uses the owner's **original portrait card**: a 1.5rem rounded rectangle, a 3px white border, `filter: saturate(0.83) contrast(1.03)`, and a red offset plate. The About section also keeps its original Inter 800 heading and slate text and tag colours (the `--about-*` tokens). The owner asked for this, so do not convert it to the arch, Fraunces, or warm ink.
- The arch (`--radius-arch`) is still available for any new portrait placements elsewhere.
- Pair the portrait with a large serif pull quote, never with a bulleted list.
- Supporting imagery (workspace, meetings, project screenshots) is allowed, but it must be warmed the same way. Never use cool blue-toned stock photography.

## Motion

Motion is already handled by `frontend/src/Reveal.jsx` and `frontend/src/motion.js`. Do not add competing scroll listeners or IntersectionObservers for reveals.

- Reveal elements with `<Reveal>`; it fires at 5% of viewport and auto-staggers siblings.
- Hover lifts are 2px and 180ms. Anything bigger feels cheap.
- Every transform-based effect needs a `prefers-reduced-motion: reduce` escape.

## Writing

Copy is part of the design. See [voice.md](voice.md) for tone, and keep headlines short enough to set at display size without wrapping more than twice.

## Before you finish

Run the audit, which catches hardcoded colors, cool-grey values, adjacent duplicate surfaces, and missing reduced-motion guards:

```bash
node .cursor/skills/design-review/scripts/audit.mjs
```

## Reference

- Full token list and when to use each: [tokens.md](tokens.md)
- Component treatments (buttons, cards, quotes, labels, numerals): [components.md](components.md)
- Copy tone and headline patterns: [voice.md](voice.md)
