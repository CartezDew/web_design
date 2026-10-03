# Analytics preferences and anonymous opt-out totals

Updated October 3, 2026.

## Website behavior

There is no consent popup. The footer **Privacy settings** link opens the Privacy section and focuses its analytics controls. The inline **Website analytics** switch applies immediately and remembers the choice in this browser for six months.

Netlify's `/analytics-policy` edge function uses the request country supplied by Netlify. Analytics defaults on only in the United States. Other countries and unknown/failed geography default off; visitors can enable it in Privacy settings. Previously saved declines, Global Privacy Control and Do Not Track override the default. No IP, city or country is returned by the policy endpoint, and its response is not cached.

Opting out stops browser events and conversion attribution, clears Google Analytics cookies and session campaign attribution, and prevents future script loading on reload. Private portal, confirmation and booking-management pages remain excluded. Forms and bookings work with analytics off. An opt-out does not delete data previously collected.

## What is counted

`POST /api/v1/public/analytics-preference/` accepts only `automation_signal`, with `reported` or `unknown`. The browser applies the preference before making this optional request, so reporting failures cannot undo the choice.

The server increments one aggregate `AuditEvent` row per UTC day. It stores total off choices, reported browser automation signals, and unclassified choices. It does not store names, emails, user IDs, client IDs, IP addresses or individual event timestamps in these rows. CSRF protection and a short-lived hashed-address throttle limit cross-site submissions and abuse. Normal infrastructure security/access logs are separate from these statistics.

These are **choices, not unique people**. Switching on and then off again can add another choice. Browser privacy signals and automatic regional defaults are not counted as manual opt-outs. `navigator.webdriver` is only a self-reported automation signal; it neither reliably detects AI nor establishes that an unclassified visitor is human. There is intentionally no report naming people who opted out.

## Reports

Admin **Insights → Analytics turned off** shows local totals for the selected period. The existing scheduled notification worker runs every five minutes, uses server-side references to the web service’s Google Analytics configuration, and also forwards completed UTC-day totals to GA4:

- `analytics_opt_out_total`: all counted off choices.
- `analytics_opt_out_automation`: choices reporting browser automation.
- `analytics_opt_out_unclassified`: choices without that signal.

In GA4 Reports or Explore, filter to the desired event name and use **Event value**. The count is sent in the standard `value` parameter; **Event count counts daily summary batches**, not choices. The all-choice event already includes the other two categories, so do not add all three together. Data becomes available after the UTC day closes and Google processes it.

These events use one fixed reporting-service client ID (`1.1`), never a visitor identity. Exclude these three event names when analyzing visitors, sessions, conversions, geography or engagement; the service can contribute one synthetic client to otherwise unfiltered user metrics. Summary events have no visitor/session attribution. Do not mark them as lead conversions/key events.

Each daily row is claimed before sending. Ambiguous network failures are not retried, preventing duplicate totals. HTTP acceptance is not proof that Google processed an event. Local totals remain authoritative if Google is disabled, unavailable, or rejects data. Rows older than Google's supported backdating window are kept locally rather than sent with an inaccurate date. Google delivery status is returned with the daily rows to authenticated administrators.

## Validation

The isolated release passed 52 frontend tests, 93 PostgreSQL backend tests and the production build. Tests cover existing preferences, regional defaults, browser privacy signals, cookie removal, failed counter requests, strict anonymous payloads, CSRF, throttling, simultaneous choices, authorization and one-time aggregate delivery. Browser QA covers desktop/mobile, default-on, other/unknown regions, existing opt-outs, browser GPC and private routes with actual Google collection blocked.
