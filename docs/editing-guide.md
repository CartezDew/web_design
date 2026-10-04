# Editing your website

Every main section has a React file for content/layout and a CSS file for appearance. Start with the matching CSS file when changing spacing, colors, sizes, or the responsive layout. Files are formatted for readable editing.

## One scrolling landing page

Work, services, about, pricing, contact, booking, the project brief, and privacy all live on the same landing page. Navigation scrolls to section anchors; service details and case studies expand in place. Sign-in, account recovery, the private dashboard, and secure booking management remain separate.

The page composition lives in `frontend/src/routes/home.jsx`. Change the order there; each section owns its styling:

- Hero: `frontend/src/sections/Hero.jsx` and `Hero.css` — original browser illustration, contained callouts, headline, and three calls to action.
- Service ticker: `frontend/src/sections/Ticker.jsx` and `Ticker.css`, with labels/links in `frontend/src/content/ticker.js`.
- Work: `frontend/src/sections/Work.jsx` and `Work.css` — all five project previews, expandable stories, and optional external live-project links.
- Services: `frontend/src/sections/Services.jsx` and `Services.css` — expandable service rows and full descriptions.
- About: `frontend/src/sections/About.jsx` and `About.css` — full founder introduction and experience.
- Process: `frontend/src/sections/Process.jsx` and `Process.css` — four steps on the black background.
- Pricing: `frontend/src/sections/Pricing.jsx` and `Pricing.css` — the three packages and custom-project starting price.
- FAQ: `frontend/src/sections/FAQ.jsx` and `FAQ.css` — expandable questions.
- Contact introduction: `frontend/src/sections/ContactCTA.jsx` and `ContactCTA.css`.
- Privacy disclosure: `frontend/src/sections/Privacy.jsx` and `Privacy.css`.
- Mobile back-to-top button (below 550px): `frontend/src/components/BackToTop.jsx` and `BackToTop.css`.
- About dropdown: `frontend/src/components/AboutMenu.jsx` and `AboutMenu.css`.
- Header, mobile menu and footer: `frontend/src/components/SiteLayout.jsx` and `SiteLayout.css`.

## Shared design and content

`frontend/src/styles/tokens.css` holds the editorial design system: the warm paper palette, warm ink text colors, the deep red (`--red: #be0303`), rationed ochre accent, Fraunces display and Inter body fonts, type scale, warm elevation shadows, the portrait arch radius, and section rhythm. `global.css` contains the four section surfaces, shared headings, buttons, the pull quote, spacing helpers and reduced-motion behavior. Local section rules override those defaults.

Never write a raw hex value in CSS — use a token. The full system, including why ochre is rationed and why no two adjacent sections may share a surface, is documented in `.cursor/skills/editorial-design-system/`. After any visual change, run `node .cursor/skills/design-review/scripts/audit.mjs`, which fails on hardcoded colors, cool-grey values that clash with the warm palette, adjacent duplicate surfaces, and missing reduced-motion guards.

`frontend/src/content/site.js` holds service descriptions, package prices, project links and FAQs. Project story copy is in `frontend/src/content/stories.js`; keep claims factual and distinguish class projects from commissioned work. Replace photos and screenshots in `frontend/assets/` and preserve descriptive alt text. The real founder portrait is also used for the social preview in `frontend/public/social-preview.webp`.

The coordinated hero headline growth and illustration entrance are in `frontend/src/sections/useHeroEntrance.js`. Framer Motion scroll reveals are in `frontend/src/Reveal.jsx`. Content remains visible when JavaScript or animation is unavailable, and reduced-motion preferences disable reveal animation. Avoid making essential content depend on an animation finishing.

## Forms, scheduling and portal

- Hero intake popup: `frontend/src/components/IntakeModal.jsx` and `IntakeModal.css` — Framer Motion fade-in/fade-out, inset red scrollbar, outside-click/Escape dismissal and focus handling. It shares the inline form’s draft, step and files. Pricing card links open the same modal with the chosen package selected, retaining other answers.
- Inline inquiry steps: `frontend/src/pages/IntakePage.jsx` and `IntakePage.css`.
- Intake package options, review labels and backend payload mapping: `frontend/src/content/intake.js`.
- Shared Eastern-time formatting: `frontend/src/content/scheduling.js`. All consultations use Eastern time (EST/EDT), with no visitor time-zone picker. Contact fields unlock after a date/time is selected; the request button stays grey while incomplete and shows validation only after a submission attempt.
- Inline calendar, time slots and secure booking management: `frontend/src/pages/BookingPage.jsx` and `BookingPage.css`.
- Consultation date trigger, calendar styling and selection animations: `frontend/src/components/ConsultationDatePicker.jsx` and `ConsultationDatePicker.css`.
- Custom accessible selects, radios and calendars: `frontend/src/components/Controls.jsx` and `Controls.css`.
- File selection, validation and progress: `frontend/src/components/FilePicker.jsx` and `FilePicker.css`.
- Sign-in, reset and invitation: `frontend/src/portal/AuthPages.jsx` and `AuthPages.css`.
- Dashboard shell and profile: `frontend/src/portal/Dashboard.jsx` and `Dashboard.css`.
- Briefs and projects: `frontend/src/portal/ProjectsPanel.jsx` and `ProjectsPanel.css`.
- Messages, appointments and availability: `frontend/src/portal/ManagementPanels.jsx`, with individual `MessagesPanel.css`, `AppointmentsPanel.css` and `AvailabilityPanel.css` files.

Booking hours are changed through the admin interface, not hardcoded in the page. Bookings are initially pending and reserve a slot until confirmation or cancellation. Client accounts are created by invitation after an inquiry is accepted. Public inquiries and bookings do not require an account.

The intake requires only name, a real email address (with an allowed ending like .com, .edu, or .gov), and a short idea. Continue stays muted until those are valid, and pressing it lists what’s missing. Service areas live in `frontend/src/content/locations.js` and feed metadata, structured data, and `llms.txt` only; they are deliberately not rendered as visible page content. The intake and booking forms share name/email in memory through `frontend/src/components/LeadContactContext.jsx`, so visitors enter them once and can edit either form. Calendar loading failures use a neutral retry/email message; raw throttling and server diagnostics are never displayed to visitors. Optional discovery fields capture audience/differentiators (`mission`), current website (`domain`), success measures, offers, features, brand/content readiness, integrations and the project approver. These use existing backend fields: the approver is labelled in `notes`; readiness is labelled in `brand`. Review/edit links retain all answers and files, and retries send only unfinished attachments. Drafts stay in memory while the page remains open; they are not written to browser storage. The admin brief panel shows these details for discovery and scoping.

File limits are enforced in both the frontend and backend: 12 active files across the brief and its linked project, 5 MiB each, 25 MiB total. If limits change, update `FILE_LIMITS` and visible help text in `FilePicker.jsx`, Django settings and validation messages in `backend/api/uploads.py`, and the privacy copy. Never rely only on browser validation.

## Navigation and search

The `pages/` folder contains reusable form components; it does not mean visitors navigate to those forms as separate pages. The section components are composed in `routes/home.jsx`, with their own CSS imports. Website messaging and metadata intentionally omit the developer’s location.

Header and footer links use `/#work`, `/#services`, `/#about`, `/#pricing`, and `/#contact`. Calls to action use `/#book` and `/#start-a-project`. Pricing links carry `?package=business#start-a-project`, preselecting a package without clearing entered contact details. Anchor scrolling accounts for the sticky header and honors reduced-motion settings.

Route registration lives in `frontend/src/routes.js`. `frontend/src/content/paths.js` prerenders only `/` and maps old public URLs to landing-page sections. The build writes matching permanent redirects, sitemap, robots file and `llms.txt`. The server-rendered homepage includes service details, FAQs, business data and Service structured data for SEO/AEO. Old public paths remain usable as redirects; they are not separate marketing pages. The generated `_redirects` file follows [Netlify routing syntax](https://docs.netlify.com/manage/routing/redirects/overview/).

Private routes stay outside the sitemap and use `noindex`; backend authorization still protects all private records. `robots.txt` is not a security boundary. Analytics has not been added. SEO/AEO foundations support discovery, not guaranteed placement. `llms.txt` is an optional reference, not a Google ranking signal; clear content, crawlability, matching structured data and genuine expertise remain the focus.

After edits, run `npm --prefix frontend test` and `npm --prefix frontend run build`, then inspect `npm --prefix frontend run preview` at desktop and mobile widths. Run `npm --prefix frontend run format` to format the frontend source.
