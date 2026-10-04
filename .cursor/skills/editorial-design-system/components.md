# Component treatments

## Section label

Uppercase Inter, tracked, muted. No numerals — keep labels short and plain.

```html
<p class="section-label">What I do</p>
```

## Headings

Display-size headings may emphasize a single word with the serif italic plus red:

```html
<h2>Websites that make small businesses feel <em>big</em></h2>
```

`em` inside a heading renders as Fraunces italic in `--red`. One emphasized word per heading. Two is shouting.

## Pull quote

The main tool for adding emotion to a text-heavy section. Use one per page, in About or near a testimonial.

```html
<blockquote class="pull-quote">
  <p>Copy that earns trust.</p>
  <cite>Cartez Dewberry</cite>
</blockquote>
```

Fraunces at `--text-h2`, hanging ochre quote mark, hairline on the left, no background fill.

## Buttons

Three variants only.

- `.button` — espresso fill, `--on-dark` text. The default.
- `.button--red` — red fill. Reserved for the single primary action in a view.
- `.button--ghost` — transparent with a `--paper-edge` border. Secondary actions.

Hover lifts 2px with `--lift-2`. Never scale a button on hover; never animate its color and position and shadow all at once at different durations.

## Cards

```css
.card {
  background: var(--paper);
  border: var(--rule);
  border-radius: var(--radius);
  box-shadow: var(--lift-1);
}
```

On `--paper-deep` sections, cards use `--paper` so they lift off the band. On espresso sections, cards use `--espresso-soft` with no border. A card never has both a heavy border and a heavy shadow — pick one as the edge.

## Portrait

The About portrait uses the owner's original card: rounded rectangle, white frame, offset red plate behind it. See `frontend/src/sections/About.css`.

```css
.portrait-wrap img {
  border-radius: 1.5rem;
  border: 3px solid var(--about-photo-border);
  box-shadow: var(--about-photo-shadow);
  filter: saturate(0.83) contrast(1.03);
  aspect-ratio: 4 / 5;
  object-fit: cover;
  object-position: center top;
}
```

Keep `aspect-ratio` and explicit `width`/`height` on the `img` so the photo does not shift during load.

## Editorial rule

A hairline with a short ochre leading segment, used to separate a heading from its content:

```css
.editorial-rule::before { background: var(--ochre); width: 44px; }
.editorial-rule::after  { background: var(--paper-edge); flex: 1; }
```

## Tags

Small, uppercase Inter, `--radius-sm`, `--paper-deep` fill with a `--paper-edge` border. On hover, border shifts to `--red` at 30% and background to `--red-wash`. Keep the 2px lift.

## Grain

Grain comes from the `surface--*` classes as a `background-image` layer. Do not add a separate `::before` overlay for it — that has to be stacked between the background and the content, and it blocks clicks unless it also gets `pointer-events: none`.

If a section needs its own background image (a feature photo, for example), layer the grain first in the `background-image` shorthand so it sits on top of the photo:

```css
background-image: var(--grain), url(photo.webp);
```
