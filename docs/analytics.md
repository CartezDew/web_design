# Analytics and business decisions

## Destinations

Google account Marc’d: `403045851`. This website has its own GA4 property, **Marc’d by Cartez — Website**, `557258592`, stream `16012811386`, measurement ID `G-2M357MD0RM`. The existing Marc’d website and mobile apps stay in property `547978095`.

[Customer needs, acquisition and conversion exploration](https://analytics.google.com/analytics/web/#/analysis/a403045851p557258592/edit/FwzLF2kSSjWXgXfPvEHneA) contains Customer needs, Acquisition & device, and Visit to submitted lead tabs. The closed user funnel is page_view → form_start → form_submit_attempt → generate_lead. Compare devices and acquisition sources to locate friction. Customer needs filters successful leads, then groups service interest and business category. Use the standard acquisition, pages, technology and demographic reports for total/active users, sources, engagement and approximate geography. Geography is approximate and consent-dependent, not a customer address.

The private `/dashboard/insights` page uses saved business records for briefs, verified emails, requests, consultations and projects. It connects service, business category, goals, package interest and content readiness to projects created. Its cohort is inquiries created within 30/90/365 days and their current outcomes. Counts are records, not unique people. A brief and booking may belong to one person; they must not be added into a unique-customer metric. Package interest is not revenue. Historical records without structured answers remain unspecified.

## Collection

The public landing page requests optional analytics permission. No Google tag loads until allowed; the footer reopens the choice. Choices expire after 180 days. Private portal, confirmation, reset and capability routes are excluded. Advertising personalization and Google Signals are disabled. Enhanced measurement is off so automatic DOM/form/history events cannot bypass the allowlist or duplicate explicit events.

Events cover page views, stable button codes, services/portfolio/FAQ interest, section views and visible engagement, form starts, steps, categorical choices, attempts, saved success, error categories, booking availability, upload outcomes and load time. Structured form answers include business category, service, primary goal, starting package, content readiness, existing-website yes/no and coarse launch window. No names, emails, phone numbers, business names, written answers, exact dates, uploaded filenames, customer URLs, record IDs or capability tokens go to GA. Section intervals can overlap: do not sum them as page time. Load time is DOMContentLoaded, not a Core Web Vital.

25 event dimensions are registered: business_type, service_interest, package_tier, primary_goal, content_readiness, existing_website, form_type, step_id, field_id, section_id, button_id, project_id (public portfolio slug only), faq_id, failure_class, availability, outcome, campaign_source, campaign_medium, campaign_id, campaign_content, duration_bucket, exit_reason, link_type, source_layer, launch_window. Metrics: duration_seconds and load_seconds, unit Seconds. generate_lead is a key event with no invented monetary value. Event retention is 14 months, with reset on new activity off. Definitions do not backfill historical data.

## Server connection

Railway backend variables:

- GA_MEASUREMENT_ID=G-2M357MD0RM
- GA_PROPERTY_ID=557258592
- GA_API_SECRET: approved Measurement Protocol secret, only in Railway; never a VITE variable, Git file or browser payload.

`/api/v1/public/analytics-config/` exposes only the public measurement ID and whether server conversions are configured. Browser calls supply client/session identifiers only with consent. The backend sanitizes campaign codes and saves coarse acquisition, without identifiers. After a new brief or appointment commits, Django sends one generate_lead with bounded categories. Replayed submissions do not generate a second conversion. No retry follows an ambiguous Google response because GA does not promise generate_lead deduplication. Google failures cannot undo a saved business record. The private dashboard remains authoritative.

Without a server secret, the browser reports successful saves. When server mode is enabled, browser generate_lead is disabled to avoid duplicates. Blocked tags, missing identifiers, opt-outs and delivery failures cause GA to undercount; never substitute it for database totals. Google HTTP 2xx alone does not establish event acceptance.

UTM codes allow letters, short digits, hyphens and underscores; never put customer details in campaign links. Example: `https://marcdbycartez.com/?utm_source=instagram&utm_medium=social&utm_campaign=fall_services&utm_content=portfolio`. Coarse acquisition lasts 30 minutes; it is a first-party hint and does not reproduce GA attribution exactly.

## Verification and release

Run frontend tests/build, backend tests, migration check and inspect migration SQL. Apply the additive intakes/scheduling 0004 migrations after a completed database backup. Check health and analytics-config after deployment. On a fresh browser, verify no Google script before permission, one after allow, no tracking on private routes, and preference withdrawal. In GA DebugView/Realtime confirm live events before claiming delivery. Reports may take 24–48 hours; a new empty report is expected until consented traffic arrives.

Local browser QA uses an isolated SQLite database, dummy GA ID, fake `.test` contact and memory email backend. It must not create production leads or send real customer emails. Tests cover privacy, opt-out, saved-only conversion, replay prevention, rollback, Google failure isolation and admin access.

No PostHog, GA360, paid dashboard, BigQuery export or new paid analytics subscription is required.

### Release record — October 3, 2026

- Marc’d by Cartez frontend: Netlify published `b5ce4d6`, deploy `6ac13f4c4f54da0008638b26`. Backend and email worker: Railway successfully deployed `58bf2f3`; web deployment `2a5ae3c5-3d62-4da0-a7ac-bb365fff6799`. A fresh 311 MB production database backup completed before deployment. Health returned `ok`; the public analytics config returned `G-2M357MD0RM` and `server_conversions: true`.
- Marc’d website: approved [PR #1](https://github.com/CartezDew/marcd_website/pull/1) merged as `1179ef1`, published on Netlify as deploy `6ac148c2a8045500089e3333`. Live browser verification found no Google tag before permission and one after allowing. GA4 Realtime subsequently displayed landing/pricing page views, `button_click`, `cta_click`, and engagement events from that verification session. The removed edge analytics forwarding no longer manufactures client IDs and synthetic visitors.
- Marc’d mobile: commit `140f0a94` pushed to `django`; production EAS update group `f931cbaf-be51-4d86-b351-5e9cb8d1bed1` published for iOS and Android, runtime `1.0.0`. Compatible installed apps receive the update through their normal update/restart behavior. Native custom event receipt after loading this update has not yet been observed; this is separate from successful publication and bundle validation.
- Validation: Cartez frontend 37 tests and production build passed; the exact deployed backend snapshot passed all 84 tests using disposable PostgreSQL. Marc’d website 9 tests and production build passed. Mobile full suite passed 269 tests, followed by 17 focused analytics tests after final additions; iOS, Android and web exports compiled successfully.
- Google’s non-ingesting Measurement Protocol debug endpoint returned HTTP 200 with an empty `validationMessages` list for the server lead payload, using the credential inside Railway. This verifies payload validity, not production event delivery. No production test leads or customer emails were created.
- The Mac resolver retained old GoDaddy addresses for `marcdbycartez.com` during QA. Google public DNS resolved the current Netlify addresses; direct requests to those addresses with normal hostname/TLS verification returned the deployed frontend. This local DNS discrepancy prevented a complete live browser conversion check for Cartez. Local end-to-end form, saved-record, consent and private-dashboard checks passed.

New definitions and repaired events collect going forward. Historical missing events cannot be reconstructed from GA. Use the saved database counts in Insights alongside consent-dependent GA traffic and conversion reports.
