# Tokens

Everything lives in `frontend/src/styles/tokens.css`. Token **names** kept from the earlier editorial system (`--ink`, `--paper`, `--espresso`, `--lift-*`, `--radius*`) so existing CSS restyles by value. Add a token before you add a color.

## Say Briefly → Marc'd mapping

| Say Briefly | Value | Marc'd token | Value | Notes |
|---|---|---|---|---|
| Forest Ink | `#1a3300` | `--ink` / `--light-ink` | `#151311` | Brand black, a hair warm. Text, borders, outline buttons |
| Highlighter Yellow | `#ffe95c` | `--marker` | `var(--red)` | Brand red as the highlighter wash, with `--marker-ink` cream text |
| Highlighter (CTA ban) | — | `--red` | `#be0303` | **Brand exception:** red *is* the primary CTA fill |
| Cream Paper | `#fcfaf5` | `--paper` | `#fcfaf5` | Page canvas, nav, cards |
| Pencil Gray | `#b6b6b6` | `--pencil` | `#bdb6ac` | Warmed hairlines, nav border, tag borders |
| Whisper Gray | `#f1f1f1` | `--ink-faint` | `#6b635a` | Spec value fails contrast; muted text uses a readable warm grey |
| Sticky Note Mint | `#d5f5c2` | `--note-sage` | `#dbe4d0` | Muted for a masculine tone |
| Sticky Note Teal | `#a8e5e5` | `--note-steel` | `#d7dfe3` | The one cool note, allowed in tokens only |
| Sticky Note Blush | `#f6d0ff` | `--note-sand` | `#efe3c8` | Featured plan, Work CTA |
| Terracotta | `#cb5521` | `--note-clay` | `#ecd2c3` | Softened to a card fill |

## Color

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fcfaf5` | Canvas |
| `--paper-deep` | `#f4efe6` | Alternate band |
| `--paper-edge` | `#e4ddd2` | Quiet dividers |
| `--pencil` | `#bdb6ac` | Visible hairlines (nav, cards, tags) |
| `--ink` | `#151311` | Text and structure (remapped on black) |
| `--ink-soft` | `#46403a` | Secondary text |
| `--ink-faint` | `#6b635a` | Captions, metadata |
| `--espresso` | `#121110` | Black band |
| `--espresso-soft` | `#1f1d1b` | Raised areas on black |
| `--on-dark` / `--on-dark-soft` | `#fcfaf5` / `#b8b1a8` | Text on black |
| `--red` | `#be0303` | Primary CTA, marker, small marks |
| `--red-deep` (`--red-hover`) | `#8f0202` | Hover |
| `--red-wash` | `#f7e4e0` | Badge fill, row hover, selection |
| `--red-on-dark` | `#ff6b5e` | Small red marks on black (≥4.5:1) |
| `--marker` / `--marker-ink` | red / `#fcfaf5` | Headline highlighter |
| `--note-sand/-sage/-steel/-clay` | see above | Sticky-note fills, one per card |

Contrast: ink on every note ≥ 12:1. Cream on red ≈ 6:1. Red numerals on black ≈ 3.2:1, which is fine only for ≥ 40px decorative numerals.

## Type

| Token | Value |
|---|---|
| `--display` | `"Bricolage Grotesque Variable"` 800 |
| `--body` | `"Inter Variable"` |
| `--mono` | `"Roboto Mono"` 400 |
| `--logo` | `"Fraunces Variable"`, for the wordmark only |
| `--tracking-display` | `0.02em` (positive; Say Briefly uses 0.04–0.05em, tightened for long two-line headings) |
| `--text-display` | `clamp(48px, 8vw, 90px)` |
| `--text-h1` | `clamp(42px, 6.4vw, 66px)` |
| `--text-h2` | `clamp(36px, 4.6vw, 55px)` |
| `--text-h3` | `clamp(22px, 2.1vw, 28px)` (Inter 700) |
| `--text-lead` | `clamp(18px, 1.4vw, 20px)` |
| `--text-body` / `--text-small` / `--text-label` | 17 / 14 / 12px |

Fonts are self-hosted with Fontsource and imported at the top of `tokens.css`.

## Shape and elevation

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Buttons, inputs, index chips |
| `--radius` | 12px | Cards, notes, frames |
| `--radius-lg` | 16px | Nav pill, modal, large panels |
| `--radius-pill` | 9999px | Tags, badges |
| `--lift-1` | subtle 1px | Button rest |
| `--lift-2` | subtle-2 | Button hover |
| `--lift-3` | soft deep | Modal and menu sheet only |
| `--lift-offset` | `4px 4px 0 ink` | Sticky-note hover, featured plan, open service |
| `--nav-glow` | red-tinted layered glow | Nav pill only |

## Rhythm

`--width` 1280px · `--gutter` `clamp(20px, 4.8vw, 72px)` · `--section` `clamp(72px, 9vw, 132px)`, plus `-tight` and `-loose` variants · base unit 8px.
