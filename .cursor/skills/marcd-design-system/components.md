# Components

Shared classes live in `frontend/src/styles/global.css`. Section-specific treatments live next to each section.

## Floating pill nav — `components/SiteLayout.jsx/.css`

- The header is transparent. `.header-inner` is the pill: 16px radius, 1px `--pencil` border, translucent cream with a blur, and `--nav-glow`.
- `data-scrolled` (set by a sentinel IntersectionObserver, not a scroll listener) shrinks it from 72px to 60px.
- Links are Inter 500 at 15px, with a red underline that wipes in on hover and on the current section.
- The CTA is a compact `.button--red` ("Let's talk").
- On mobile the menu opens as a matching rounded sheet under the pill.
- The C/D wordmark keeps Fraunces (`--logo`). Never restyle it.

## Buttons

```html
<a class="button button--red button--lg">Plan your website <ArrowRight/></a>   <!-- primary -->
<a class="button button--outline">See my work <ChevronRight/></a>             <!-- secondary -->
<a class="button button--note">…</a>                                           <!-- soft path -->
```

- Inter 500 at 16px, 6px radius. Default height 52px; `--lg` is 60px.
- Hover lifts 2px with `--lift-2`, and the trailing icon nudges 3px.
- Exactly one red-filled button per view.
- On black bands, `.button--outline` inherits the inverted ink automatically.

## Red Marker heading

```html
<h2>Useful design. Solid <em>engineering.</em></h2>
```

- `h1 em`, `h2 em` and `.marker-line em` render cream text on a red wash, skewed -6deg and rotated -1deg.
- The wash is `::before`, so it can wipe in.
- Use it once per heading. Pick the word that carries the promise.

## Tagline badge

There are two variants:

- **Generic `.badge`:** a red-wash pill holding an icon plus Inter 500 at 13px.
- **Hero eyebrow (`.hero-eyebrow` in `Hero.css`):** the signature version, built as a sticker.
  - Sand note fill, 1.5px ink border, 6px radius, and a hard `3px 3px 0` ink shadow.
  - Tilted -1.2deg, using the `rotate` property so it composes with framer's entrance transform.
  - Text is Inter 600 at 14px.
  - It leads with a 28px ink chip holding the red spark icon (`--red-on-dark`).

## Section label — `.section-label`

Roboto Mono, uppercase, 0.12em tracking, `--ink-soft`, with a 22px red rule before it (`--red-on-dark` on black bands).

## Sticky-note card — `.note-card`

```html
<div class="note-card note-card--sand note-card--lift">…</div>
```

- 12px radius, 26px padding, 1px ink border, flat fill, no resting shadow.
- `--lift` adds the hover: lift 3px, rotate -0.6deg, hard `--lift-offset` shadow.
- One note color per card. Never place two colored notes next to each other in a row.
- In use:
  - Work CTA (sand).
  - Hero floating notes (red, sage, steel).
  - Services rows: cream at rest, their note color on hover or open, rotating sand → sage → steel → clay.
  - Featured price plan (sand, 2px ink border, offset shadow, red "Most popular" mono flag).

## Tag — `.tag`

A mono pill with a 1px `--pencil` border, 11px uppercase. Used in the hero trust row, Work categories and skill lists.

## Reassurance caption — `.reassurance`

13px `--ink-faint` text with a red icon, placed under the primary CTA. Use only facts already on the site.

## Project card and Work carousel — `sections/Work.*`

Every project must read as **a live website you can open**. That is the rule behind every detail below.

- **One bordered card per project.** The screenshot, caption and buttons sit inside a single 1px ink card, so the buttons visibly belong to the image above them.
- **The tablet screenshot carries the message.** The 4:3 images (mat and shadow baked in) fill the frame edge to edge with no padding and no extra browser chrome.
- **Never show web addresses.** Some projects are hosted on netlify.app subdomains, and the address adds nothing a client needs.
- **The screenshot is a link to the live site.** It is pointer-only (`tabIndex=-1`, `aria-hidden`), so screen readers meet one labelled link instead of a duplicate. On hover, a "Visit live site ↗" pill rises. On touch devices (`hover: none`) the pill sits permanently in the corner.
- **Caption:** a mono category pill, an Inter 700 title and the one-line intro. No project numbers and no Live tags: the "Visit live site" button already says it.
- **Actions:**
  - The filled ink **Visit live site ↗** comes first, followed by the outline **Behind the project**.
  - Hovering anywhere on the card turns the live link red, tying the button to its image.
  - On phones the two buttons stack, with the live link on top.
- **Legend** above the grid, plain text: "Every project is a real, working website. Open any screenshot to visit it."
- **Desktop (above 900px):** a 6-column grid. The first two cards span 3 columns as featured projects; the next three span 2.
- **900px and below:** one swipeable row.
  - Scroll-snap, full-bleed to the screen edges so the next card peeks in.
  - Cards are 84% wide on phones and 46% on tablets.
  - `min-width: 0` on the cards so long domains can't widen them.
  - A mono `02 / 05` counter, prev/next ink-edged square buttons that **wrap** (next on 5 → 1, prev on 1 → 5), and dots (the active one is a red pill).
  - The "Visit live site" button is visually hidden here (the screenshot is the link, with its corner label); it stays focusable and appears on keyboard focus.
  - Every card is the same height: category pill on one line with an ellipsis, title and subtitle clamped to two lines with reserved space.
  - The current card is tracked by an IntersectionObserver rooted on the row. The arrows scroll the row, never the page.

## Intake step 3 — `pages/IntakePage.*`

- Short checklists with red check marks replace paragraphs.
- **Photos of you** (sand sticky note, "Recommended · 3–5"): a checklist (headshot, you at work, team or space), a 3-segment progress bar, and an images-only `FilePicker` (`imagesOnly`). Files upload with the `people` asset group.
- **Brand and reference files** (optional): a checklist and the regular picker, uploaded as `inspiration`.
- Both pickers share one 12-file / 25 MB limit (each passes the other's files as `existing`).

## FAQ illustration — `sections/FAQ.*`

- Above 900px: a hand-drawn sand "?" bubble and sage "!" bubble under the intro, drawing on with the reveal.
- The intro column is sticky only when the window is at least 880px tall, so it never gets cut off. Phones and small tablets show neither.

## Price plan — `sections/Pricing.*`

- A cream card with a pencil border.
- The price is in Bricolage at 56px, with a red `+`.
- Meta text is mono, and checkmarks are red.
- The CTA spans the full width. The featured plan gets a red CTA; the others get outline CTAs.

## Process steps — `sections/Process.*`

On the black band: a red Bricolage numeral (`01`–`04`, 56–84px), an Inter 700 title, and soft copy.

## FAQ — `sections/FAQ.*`

- Each item is a separate cream card.
- Each card has a red mono `Q1` index and a plus icon that rotates to × when open.
- The open card gets an ink border.
- The intro ends with a red "Book a free call" button.

## Sketch doodles — `components/Sketch.jsx`

```jsx
<Sketch variant="arrow" className="hero-arrow" />
```

- Variants: `arrow`, `squiggle`, `underline`, `circle`, `star`, `spark`.
- Monoline, `currentColor`, 2px non-scaling stroke, 40% opacity, `aria-hidden`.
- Position them absolutely from section CSS.
- They are atmosphere: use at most one or two per section. Never use one as an icon or to carry meaning.

## Mobile control bar — `components/MobileCTA.jsx` and `components/BackToTop.jsx`

The two fixed buttons form one bar, so they never clash.

- **MobileCTA**
  - Shown at 760px and below, once the hero, booking, intake and contact sections are all off screen.
  - A red full-width `.button--red` with a `3px 3px 0` ink shadow. It reuses the page's `openIntake` handler.
- **BackToTop**
  - Shown below 550px, after 500px of scroll, and hidden over the footer.
  - A 52px cream square: 1.5px ink border, 6px radius, the same ink offset shadow, and an ink arrow (red on hover).
  - Pressing it pushes it into its shadow. It has no pulse or glow, because red is reserved for the CTA.
- **Shared geometry:** both are 52px tall and sit 20px from the bottom. The CTA stops 62px short of the right edge (the square plus a 10px gap) whenever BackToTop can appear.
- **Frosted dock:** `.mobile-dock-scrim` (rendered by MobileCTA) is a full-width fixed band behind the bottom bar. It uses `backdrop-filter: blur(12px)` with a cream tint, feathered at the top with a mask. It follows the CTA's `data-visible`: it fades in over 360ms when the CTA appears and fades out when the CTA steps aside (hero, booking, intake, contact, footer). It is never shown in the footer.

## Portrait (About)

The owner's original card stays as it is: rounded rectangle, white frame, red offset plate, Inter 800 heading, `--about-*` slate tokens. Do not convert it.
