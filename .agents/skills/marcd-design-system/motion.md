# Motion and character

Motion should feel like a pen on paper: quick, confident, a little hand-made. It must never block reading.

## The plumbing (do not duplicate)

- **`frontend/src/motion.js`**
  - Its boot script adds `.motion` to `<html>` only when IntersectionObserver exists and the user hasn't asked for reduced motion.
  - A 2.5s failsafe removes the class if hydration fails.
- **`frontend/src/Reveal.jsx`**
  - `<Reveal>` uses one shared observer.
  - Elements entering together stagger by 0.09s, capped at 0.45s.
  - The entrance runs for 800ms, ease-out.
  - It sets `data-revealed` when it plays.
- **`frontend/src/sections/useHeroEntrance.js`**
  - This is the only place framer-motion is used: the hero sequence.
  - It sets `data-copy-entered` and `data-visual-entered` when done.

Never add scroll listeners or extra reveal observers. The only other observers are the nav sentinel (SiteLayout) and the MobileCTA watcher.

## Hide-until-played pattern

Anything hidden before it animates must be hidden **only** under motion, so reduced-motion and no-JS users see the final state:

```css
@media screen and (prefers-reduced-motion: no-preference) {
  .motion [data-reveal]:not([data-revealed]) .thing { /* start state */ }
}
```

## Effects

| Effect | Where | How |
|---|---|---|
| Marker wipe | Every `h1 em`, `h2 em`, `.marker-line em` inside a Reveal | `::before` goes from `scaleX(0)` to `scaleX(1)`, origin left, over 700ms with a 260ms delay |
| Hero marker stamp | "big!" | framer scales the word in, then the marker wipes once `data-copy-entered` lands |
| Sketch draw-on | `<Sketch>` inside a Reveal or the hero | `pathLength=1`, `stroke-dashoffset` goes from 1 to 0 over 1100ms with a 350ms delay |
| Note drift | Hero floating notes | 6s ease-in-out on `translate` (composes with inline transforms), ±5px, staggered |
| Card lift | `.note-card--lift`, price plans, Work frames | 2–3px lift, slight -0.6deg tilt, hard offset shadow |
| Button | `.button` | 2px lift, `--lift-2`, icon nudges 3px, press scales to 0.985 |
| Nav underline | Nav links | red `::after` wipes from `scaleX(0)` to 1 over 220ms |
| Nav tighten | Pill | `min-height` 72px → 60px when `data-scrolled` |
| Ticker | Black band | 135s marquee that pauses on hover or focus |
| Grid and seal | Hero visual | After the mockup lands (`data-visual-entered`): the grid fades in and the veteran-owned seal stamps down (1.5 → 0.94 → 1) |
| Seal turn | Hero seal ring text | 40s linear rotation, the one other permitted loop besides the ticker and note drift |
| Cursor tilt | Hero mockup stage (desktop, fine pointer only) | Leans toward the cursor, max 4deg, one pointermove listener batched per frame, resets on leave |
| Signature | Under the hero intro | `<Sketch variant="signature">` draws on with the hero sketches |
| Card deal | FAQ questions (`<Reveal effect="deal">`) | Each card drops from 56px above, tilted ±6–7deg on a hard ink shadow, lands flat with a 3px settle; 680ms, 80ms stagger (cap 0.96s). Reveal sets `data-revealed` + `--reveal-delay`, CSS runs it |
| FAQ / Services toggle | Details | icon rotate plus a 240ms content fade-down |

## Limits

- Hover movement is 2–3px. Anything bigger reads as cheap.
- Every transform-based effect needs a `prefers-reduced-motion: reduce` escape. The global reduce block also clamps all durations.
- Don't loop anything except the ticker, the note drift, and the hero seal.
- Don't animate layout properties on scroll.
