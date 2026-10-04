# Token reference

Defined in `frontend/src/styles/tokens.css`. Never bypass these with a literal hex value.

## Color

### Paper (backgrounds)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#faf7f2` | Default page and section background. Warm off-white, never `#fff`. |
| `--paper-deep` | `#f2ece2` | Alternating band, card fills, form wells. |
| `--paper-edge` | `#e5dbcd` | Hairlines, borders, dividers. |
| `--espresso` | `#191411` | Dark dramatic sections, footer. |
| `--espresso-soft` | `#241d18` | Cards sitting on espresso. |

Pure white is reserved for text on espresso and for the thin frame around portraits. There is no `#fff` background anywhere.

### Ink (text)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#1a1512` | Headings and primary text. Warm near-black. |
| `--ink-soft` | `#4a423b` | Body copy. |
| `--ink-faint` | `#7d7268` | Captions, labels, metadata. |
| `--on-dark` | `#f7f2ea` | Text on espresso. |
| `--on-dark-soft` | `#b9aea2` | Secondary text on espresso. |

Minimum body contrast is 4.5:1. `--ink-faint` on `--paper` passes; `--ink-faint` on `--paper-deep` does not pass at small sizes, so use `--ink-soft` there.

### Accent

| Token | Value | Use |
|---|---|---|
| `--red` | `#be0303` | The brand signal, from the C/D wordmark. Primary buttons, active states, the one word in a headline that matters. |
| `--red-deep` | `#8f0202` | Hover state for red. |
| `--red-wash` | `#f7eae7` | Tinted backgrounds, highlight behind text. |
| `--ochre` | `#b4752c` | Editorial marks only. |

**Ochre is rationed.** At most two ochre elements visible at once, and only on: a rule under a heading, a small icon, or a pull-quote mark. Never on body text, never on a button, never as a background fill. It exists to add life, and it stops working the moment it is everywhere.

## Type

| Token | Value |
|---|---|
| `--display` | `"Fraunces Variable", Georgia, serif` |
| `--body` | `"Inter Variable", system-ui, sans-serif` |
| `--text-display` | `clamp(52px, 8vw, 112px)` |
| `--text-h1` | `clamp(42px, 6.2vw, 82px)` |
| `--text-h2` | `clamp(32px, 4.2vw, 56px)` |
| `--text-h3` | `clamp(22px, 2.3vw, 30px)` |
| `--text-lead` | `clamp(18px, 1.4vw, 21px)` |
| `--text-body` | `17px` |
| `--text-small` | `14px` |
| `--text-label` | `12px` |

Labels are uppercase Inter at `letter-spacing: 0.18em`. Headings are Fraunces at `letter-spacing: -0.02em`.

## Elevation

Shadows are warm brown, derived from the ink, never black or slate.

| Token | Use |
|---|---|
| `--lift-1` | Resting cards and inputs. |
| `--lift-2` | Hovered cards, floating notes. |
| `--lift-3` | Portraits and the hero mock. |

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `5px` | Tags, inputs, small controls. |
| `--radius` | `9px` | Buttons, cards. |
| `--radius-lg` | `22px` | Large panels, image frames. |
| `--radius-arch` | `190px 190px 10px 10px` | Portraits only. The signature shape. |

## Rhythm

| Token | Value | Use |
|---|---|---|
| `--width` | `1280px` | Content max width. |
| `--measure` | `68ch` | Max width for reading copy. |
| `--gutter` | `clamp(20px, 4.8vw, 72px)` | Horizontal page padding. |
| `--section` | `clamp(72px, 9vw, 132px)` | Default vertical section padding. |
| `--section-tight` | `clamp(48px, 6vw, 84px)` | Dense sections (FAQ, ticker). |
| `--section-loose` | `clamp(96px, 12vw, 180px)` | Feature moments (hero, About, closing CTA). |

Varying section padding is as important as varying background color. Three sections in a row at `--section` is what flatness looks like.

## Texture and motion

| Token | Use |
|---|---|
| `--grain` | Inline SVG turbulence. Applied via a `::before` overlay on paper surfaces. |
| `--rule` | `1px solid var(--paper-edge)` for editorial hairlines. |
| `--ease` | `cubic-bezier(0.22, 0.61, 0.36, 1)` for interface motion. |
| `--ease-entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` for reveals, matching `Reveal.jsx`. |
