# Marc’d by Cartez: the customer journey and email wording

This guide describes the confirmation workflow deployed on October 3, 2026. It follows the running website and its actual email templates. Text in `{braces}` represents information filled in for that customer; private links below are placeholders, never real access links.

**Update prepared October 3:** a branded email redesign and expanded image-upload support have been implemented and tested locally but are not yet published. The plain-text examples below document the earlier live emails the owner received; the redesign is described in the next section. Confirmation actions, deadlines, project approval, and manual call-joining instructions stay the same.

The key distinction: **sending a request saves the information immediately; confirming an email makes a call booked or a brief eligible for you to accept.** A project starts only after your own review and agreement with the customer.

Automated emails come from **Cartez Dewberry <letsbuild@marcdbycartez.com>**, using your existing Microsoft 365 mailbox. Your notifications go to **letsbuild@marcdbycartez.com**. Customers can reply directly to that address. The connection authorizes sending; it does not read your inbox or synchronize your calendar.

## Branded email update awaiting publication

New emails use a 600 px white layout, readable Arial/Helvetica text, a single red action button, a brief date/status panel where useful, and the website's **C/D** signature at the bottom. The logo is styled text, so it remains visible when a mail app blocks downloaded images. Mobile layouts use narrower spacing. Secure links are behind descriptive buttons instead of appearing as long token strings in the HTML version. There are no tracking pixels or remote font/image dependencies.

Client brief receipts are shortened to a thank-you, confirmation request, 48-hour deadline, and explanation that confirmation creates no project or payment commitment. The complete submitted answers remain in the owner's notification and dashboard. The new client wording is:

> Thanks for sharing your idea. Your brief is saved, and I’ll review it personally. Please confirm your email to take the next step.

The customer receipt retains the simple layout approved in the first preview; the detailed answer panel is for owner notifications. Its footer says **Questions? Reply to this email.** followed by the clickable **letsbuild@marcdbycartez.com** address. The actual Reply-To header uses the same mailbox. The C/D signature still links to the website.

The button says **Confirm email**. The note says the link works for 48 hours and that project details will be agreed together. Pending-call emails show **Confirm appointment**, the Eastern appointment time and deadline, and a smaller **Manage your request** link. Confirmed-call emails say joining instructions will arrive personally and retain the calendar attachment. Cancellation, completion, portal invitation, project update, message, password-reset, and owner notification emails use the same visual identity.

The outbox stores the exact HTML alongside the plain-text body, so retries preserve the original version. Microsoft delivery uses MIME for styled messages to retain HTML, plain text, reply-to, recipients, and calendar attachments together. Already queued plain-text messages remain unchanged. Publishing requires the additive `communications.0005_emaildelivery_html_body` migration and updated web/worker code. The redesign passed seven desktop and seven mobile browser preview checks and is covered by the 93-test PostgreSQL backend suite; actual styled Outlook/Gmail rendering still needs an inbox check after publication.

On October 3, Microsoft accepted two owner-authorized styled previews addressed only to `letsbuild@marcdbycartez.com`: **TEST — Customer design** and **TEST — Owner notification**. They use the existing live audit brief and its real confirmation/dashboard links, with the correct Reply-To address. No additional brief or appointment was created. These previews used the currently deployed mail transport; they do not publish the new templates or verify the new MIME/outbox release. Recipient visual review remains pending.

## Path 1: someone requests a consultation

1. **They choose a date and available time.** The website uses your manually managed availability and a 60-day booking window. Every consultation is 30 minutes. Website times, confirmation emails, and portal appointments use Eastern time: EST in winter and EDT during daylight saving time. Visitors do not choose a time zone.
2. **They enter their contact details and submit.** The backend checks required fields and checks that the time is still available. If someone else has taken it, the visitor must choose another time.
3. **Their request is saved in Railway PostgreSQL as Pending.** The record contains their name, email, requested time, notes, status, and confirmation deadline. The time is held for up to one hour, ending sooner if the appointment would start before then.
4. **Two emails are queued immediately.** The customer receives the confirmation request below. You receive their request details, even though they have not confirmed. You can review it under [Appointments](https://marcdbycartez.com/dashboard/appointments) and contact them directly.
5. **The customer opens their email link and presses “Confirm appointment.”** Opening the link alone does not book anything; this also prevents an email security scanner from accidentally confirming a call.
6. **The appointment becomes Confirmed.** The system saves their confirmation timestamp, emails them the booked details with a `consultation.ics` calendar attachment, and sends you a confirmation update. Their private management link lets them review, reschedule, cancel, or download the calendar entry after confirmation.
7. **You send the joining instructions and have the conversation.** Video meeting links and call instructions are not generated automatically. The confirmation email tells the customer that you will email how to join before the call.

**If they do not confirm:** the hold ends and the time becomes available to other visitors. The request is retained; the scheduled worker marks it Expired, normally within five minutes. You still have their contact details and notes. There is no automatic expiration email or reminder sequence. They can choose a new available future time, which requires a fresh confirmation.

**If they reschedule:** the new time becomes Pending, gets a new hold and confirmation email, and invalidates the previous confirmation link. Cancellation releases the slot and sends an update. A consultation request alone does not create a client portal account or a project.

### Customer email: appointment requested

**Subject:** Confirm your consultation with Cartez

```text
Hi {first_name},

Your 30-minute consultation is pending: {weekday, Month DD at HH:MM AM/PM EST/EDT}.
Your request is received, but your appointment is not booked yet. Please confirm by {Month DD at HH:MM AM/PM EST/EDT}. The time is held for up to one hour.
Open this link, then press Confirm appointment to book your call:
{secure_appointment_confirmation_link}
All appointments are scheduled in Eastern time (EST/EDT).
View, reschedule, cancel, or download your calendar entry: {secure_appointment_management_link}

If you didn’t request this, no action is needed. Questions? Reply to this email.

Cartez
```

The management link works while the request is pending, but **calendar download is available only after confirmation**. No calendar attachment accompanies the pending email.

### Your email: appointment requested

**Subject:** Consultation request — awaiting customer confirmation

```text
Name: {first_name} {last_name}
Email: {email}
Requested time: {weekday, Month DD at HH:MM AM/PM EST/EDT}
Duration: 30 minutes
Time zone: Eastern time (EST/EDT)
Status: Pending
Email confirmed: No
Notes: {customer_notes_or_None}
You can reach out directly while awaiting confirmation.
Review: https://marcdbycartez.com/dashboard/appointments
```

### Customer email: appointment confirmed

**Subject:** Your consultation with Cartez

```text
Hi {first_name},

Your 30-minute consultation is confirmed: {weekday, Month DD at HH:MM AM/PM EST/EDT}.
Your appointment is booked. Cartez will email how to join before the call.
All appointments are scheduled in Eastern time (EST/EDT).
View, reschedule, cancel, or download your calendar entry: {secure_appointment_management_link}

If you didn’t request this, no action is needed. Questions? Reply to this email.

Cartez
```

**Attachment:** `consultation.ics`. The appointment instant is correct; the customer's calendar app may display it in the app's own time zone.

Your matching email has the subject **Consultation update**, with the same fields as your request email, now showing `Status: Confirmed` and `Email confirmed: Yes`.

For cancellation or completion, the customer subject remains **Your consultation with Cartez**. The first status sentence says `cancelled` or `completed` instead of `confirmed`, and the “Your appointment is booked…” sentence is omitted. Your email remains **Consultation update**, with the current status. A cancellation calendar attachment marks the event cancelled; importing it depends on the customer's calendar app.

## Path 2: someone sends a project brief

1. **They select “Plan your website” or a pricing package's “Start a project” button.** The intake opens in the landing-page modal. A package button selects that starting package; this is an expression of interest, not a purchase.
2. **They provide their contact information and project answers.** Required contact details are needed to continue. The brief gathers the business, project idea, audience, goals and success criteria, pages, services/products, features, website/domain, inspiration links, brand direction, integrations, desired launch date, social links, and notes where provided. There is no budget-range question. Contact information entered in the intake or consultation form is shared between the two during that page session so they can avoid retyping it.
3. **They optionally select supporting files.** They can send inspiration, screenshots, logos, current images, or a PDF explaining their ideas. The limits are 12 files, 5 MiB per file, and 25 MiB combined; the interface calls these MB. The live release audited on October 3 accepts JPG/JPEG, PNG, WebP, and PDF. The upload update validated locally adds GIF, AVIF, BMP, and TIFF (`.tif` and `.tiff`); it still requires deployment. That update explicitly says **Images and PDF files only**, rejects other documents, checks that image bytes match their declared format, and requires a readable PDF that opens without a password. TIFF files show a file icon because most browsers cannot preview them. SVG, HEIC/HEIF, Word documents, archives, and executables are not supported. Other documents can be shared as a URL or discussed with you directly.
4. **The backend saves the brief before email delivery and file uploads complete.** It saves the answers and contact information in PostgreSQL, then queues the customer receipt and your notification. File uploads follow, with validation and a private backup copy before a file is marked accepted. A saved brief does not imply every selected file finished uploading; review the uploaded files in the dashboard and follow up if something is missing.
5. **You receive the details immediately.** The notification includes the submitted answers and a link to [Project briefs](https://marcdbycartez.com/dashboard/briefs). The files are available there as uploads finish. They are not attached to the receipt email. You can review everything and contact the customer while confirmation is pending.
6. **The customer confirms their email within 48 hours.** They open the emailed link and press “Confirm email.” Their confirmation timestamp is saved, the website shows success, and you receive **Project email confirmed**. There is no second customer email at this particular step.
7. **You review and decide whether to accept the brief.** Confirmation does not automatically create a project, invite them to a portal, accept a contract, or charge them. Discuss scope, pricing, timing, and any missing content personally. The dashboard and backend prevent accepting an unconfirmed brief or starting its project.
8. **When ready, you select “Accept & invite client.”** The brief becomes Accepted, a project is created in Discovery, a project conversation is created, and the customer receives portal access as described below.

**If they do not confirm:** the brief, answers, and accepted files stay saved; expiry does not delete them. You can email or call them directly. Use **Send fresh confirmation email** in the brief's admin view to send another 48-hour link. There is a one-hour cooldown between sends, and a new link invalidates the old one. Correcting their email in the admin view clears verification and sends a fresh link to the corrected address. The customer must still confirm before acceptance.

### Customer email: project received

**Subject:** Your project brief is received — confirm your email

```text
Hi {name},

Thanks for sharing your idea. I have your brief and can review it now. Please confirm that this is your email address before I create your project. Opening the link lets you review; press Confirm email to finish.

{secure_project_confirmation_link}

This link works for 48 hours. Confirming does not commit you to a project or payment. We’ll agree on scope, pricing, and timing together before work begins.

Your submitted details:

{submitted_brief_summary}

If you didn’t send this, no action is needed. Questions or corrections? Reply to this email.

Cartez
```

`{submitted_brief_summary}` includes each nonempty saved answer, separated by a blank line. The current fields use these labels: Name, Email, Phone, Business, Project idea, Audience, Success, Pages, Goal, Products/services, Features, Inspiration URL, Website/domain, Target launch, Brand direction, Integrations, Starting package, Referral, Social URLs, and Notes. For example:

```text
Name: Jordan Example

Email: jordan@example.com

Business: Example Studio

Project idea: A website where customers can see our work and request appointments.

Goal: More qualified inquiries and easier booking.
```

This example is fictional. The actual email contains the customer's own saved answers. Empty answers are omitted. Additional discovery context collected by the form can appear in Notes. The template also supports Business category, Service interest, and Content readiness when those separate fields are available; they are not separate database fields in this deployed release.

### Your email: project received

**Subject:** New project brief — awaiting email confirmation

```text
The brief is saved; customer email confirmation is pending. You can reach out directly now.

{submitted_brief_summary}

Review the full brief and files (as uploads finish): https://marcdbycartez.com/dashboard/briefs
```

### Your email: customer confirmed their project email

**Subject:** Project email confirmed

```text
{name} confirmed {email}. The brief is ready for your review.
https://marcdbycartez.com/dashboard/briefs
```

## From accepted brief to the client portal

**For a new client:** accepting the confirmed brief creates an inactive client account and emails a private invitation. The customer opens it, enters their name, and sets a password meeting the site's requirements, including at least 12 characters. Completing the invitation activates their account and signs them in. Matching earlier appointment records are linked to that client account. The invitation expires after 48 hours.

**For an existing active client:** the project is linked to their account and they receive a sign-in link. They keep their existing password.

Clients can view their own projects, files, messages, and linked appointments. Your admin account can manage the customer records, projects, messages, and availability. An email-confirmation link is separate from a portal invitation: confirming a brief alone does not give them a login.

You move projects through **Discovery → Planning → Design → Development → Client review → Launched**, with **Paused** available when needed. These are manual updates; the system does not infer progress from a call or an email. A status update sends an email, and a portal message sends a notification linking back to the conversation.

### New client invitation

**Subject:** Your Marc-D client portal invitation

```text
Set up your client portal within 48 hours: {secure_portal_invitation_link}
```

### Existing client receives another project

**Subject:** A project was added to your Marc-D portal

```text
Sign in to view {project_name}: https://marcdbycartez.com/sign-in
```

### Project status update

**Subject:** {project_name} status update

```text
Your project is now in {status_display}. View details: https://marcdbycartez.com/dashboard
```

### Portal message notification

**Subject:** New message: {conversation_subject}

```text
A new portal message is waiting at https://marcdbycartez.com/dashboard/messages.
```

When you send the message, the notification goes to the client; when the client sends it, it goes to the admin. The message itself stays in the portal rather than being copied into the notification email.

### Forgotten password

**Subject:** Reset your client portal password

```text
Reset your password: {secure_password_reset_link}
```

These portal notifications are functional, short, plain-text emails. The `Marc-D` spelling above reflects the current templates exactly; it is not a rewritten marketing draft. To edit the copy, see the source links below.

## Where the information lives and how email delivery works

- **Railway PostgreSQL:** customer contact details, brief answers and URLs, appointments, project records, portal messages, confirmation state, file metadata, audit events, and the email outbox. The outbox saves the recipient, subject, and body so failed sends can be retried. Passwords are hashed, and Microsoft authorization tokens are encrypted.
- **Railway private storage:** accepted image and PDF bytes in `client-uploads`; a verified second copy in `client-upload-backups`. Files are associated with the brief and accessible to its client after portal setup. Downloads require authorization or a temporary signed link; they are not public website assets. Keep emailed access links private.
- **Microsoft 365:** the messages sent through your existing mailbox and the replies customers send to you. A reply reaches your normal inbox; it does not automatically become a portal message or update project status.
- **Backups:** database daily, weekly, and monthly backups plus point-in-time recovery are configured. A fresh 310 MB database backup completed before the confirmation migration. Accepted files must have their separate private backup copy before being marked uploaded. The two file buckets remain within Railway; this is not an independent off-provider disaster-recovery copy. An isolated restoration drill remains to be completed.

The application saves the request and its outgoing email records together, then attempts delivery after the database transaction commits. If Microsoft is temporarily unavailable, the request remains saved and unsent emails remain queued. The Railway email worker retries eligible messages every five minutes, up to ten attempts. Persistent failures need investigation; customers should not keep submitting duplicate requests just because email is delayed.

“Sent” in the outbox means Microsoft accepted the message for sending, not that the recipient read it or that it necessarily reached their inbox. Junk filtering and mail delivery can still affect arrival. A rare interruption after Microsoft accepts a message but before the application records success can produce a duplicate on retry. [Microsoft documents this acceptance-versus-delivery distinction](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0).

No automatic reminder sequence, contract approval, payment collection, video-meeting creation, or external calendar synchronization is part of this flow. There is no permanent client-file deletion job enabled. Treat retention and cleanup as a separate business decision.

## Your day-to-day follow-up

1. Review new Pending appointments and new briefs in your dashboard, even before customer confirmation. Your immediate emails give you the contact details to follow up personally.
2. Check that supporting files finished uploading. Ask for missing content or clarify unclear goals before agreeing to a build.
3. For confirmed calls, send the meeting or phone instructions before the appointment. Keep [Availability](https://marcdbycartez.com/dashboard/availability) aligned with your real calendar. Initial hours are Monday–Friday 10:30 AM–8 PM and Saturday–Sunday noon–9 PM, Eastern; you can change them manually.
4. For unconfirmed briefs, follow up directly and send a fresh confirmation when appropriate. For expired appointment holds, help them choose another time.
5. After email verification and your scope/pricing agreement, accept the brief and invite the client. Update project progress and use portal messages as the work proceeds.
6. Check failed or unsent emails if a customer reports no receipt. There is no automatic promise of a response within a particular number of hours.

## Verification and remaining launch checks

The release passed 75 backend tests on isolated PostgreSQL, including booking contention, the 12-file limit under concurrent uploads, and duplicate confirmation handling; 26 frontend tests and the production build also passed. Desktop and 390 px mobile confirmation screens were checked. Railway web/worker deployments and the Netlify frontend were published. Microsoft authorization, receipt of your admin setup email, your usable admin password, and the email worker were verified. A real customer confirmation email has not been independently checked in a recipient's live inbox during this release.

The October 3 follow-up audit reached the custom domain and API normally over HTTPS. It exercised the public homepage at 1440 × 1000 and 390 × 844: navigation, all 19 disclosure sections, five portfolio stories, intake modal/draft preservation, every intake dropdown, package preselection, file selection/rejection/removal, and consultation date/time selection. No JavaScript exceptions, blank page, framework error overlay, or horizontal overflow appeared. All eight page images loaded after scrolling, and the five portfolio destinations returned HTTP 200. LinkedIn blocked the automated link check, so that external destination is unverified.

One owner-authorized **AUDIT TEST** brief was submitted through the live form to `letsbuild@marcdbycartez.com`, and five separate JPG, JPEG, PNG, WebP, and PDF attachments completed preparation, storage transfer, and finalization. One test consultation for October 13, 2026 at 10:30 AM EDT was saved as Pending. The owner confirmed inbox receipt and supplied Outlook screenshots of the brief receipt, owner notification, and pending consultation email. Customer confirmation and subsequent live calendar download/cancellation remain unverified. The test records are labeled and must not be treated as real project requests.

The upload update passed **48 frontend tests, 88 backend tests on isolated PostgreSQL (including all three concurrency tests), and the production build**. Its production preview passed the same desktop/mobile interaction walkthrough with all ten supported filename extensions, without console or network errors. The new upload formats and readable-PDF validation are local changes until published. Existing unrelated analytics backend changes were left intact.

Three fresh browser contexts per performance profile measured median desktop TTFB **0.170 s**, first contentful/largest contentful paint **0.396 s**, and load event **0.492 s**. Mobile emulation at 390 px, 1.6 Mbps download, 150 ms latency, and 4× CPU slowdown measured median first contentful/largest contentful paint **1.208 s** and load event **3.009 s**. Layout shift was approximately **0.003 desktop / 0.014 mobile**. These are controlled Chromium lab measurements, not field Core Web Vitals or a Lighthouse score; full-page interaction responsiveness and real-device Safari remain outside that measurement.

The initial audit identified a missing analytics-config endpoint and favicon. The separate analytics release restored the endpoint. Release `4c8a399` published the C/D SVG/ICO/Apple icons and a compact analytics notice; all three deployed icon files match the local assets. Live desktop/mobile checks on the custom domain, using its authoritative address only in the test browser, passed for the notice, refusal, reopening preferences, and favicon links. Analytics remains opt-in; these checks did not send test events to Google.

The owner's router continued returning the former GoDaddy addresses, while authoritative DNS, Cloudflare, and Google DNS returned the current Netlify addresses. The supplied Netlify rebuild log succeeded; rebuilding does not invalidate the router's DNS cache. The owner chose to keep network settings unchanged and wait for that cache to expire. The Netlify production hostname shows the current release. Complete recipient-side email confirmation, publish and recheck the upload/email updates, and complete the isolated recovery drill before calling all launch checks finished.

## Where to change the wording

- [Project receipt and confirmation](../backend/api/confirmations.py): `send_brief_confirmation`, `brief_summary`, and the owner confirmation notification.
- [Consultation emails and calendar attachment](../backend/scheduling/services.py): `notify_appointment` and `calendar_text`.
- [Owner brief receipt, portal invitations, project updates, and message notifications](../backend/api/views.py): public intake creation and the corresponding admin/message actions. The password-reset wording is also here.
- [Email queue and delivery](../backend/api/notifications.py): `queue_email` and `deliver_email`; sender settings are configured privately in Railway.
- [Technical setup and recovery notes](backend-setup.md): deployment, storage, backup, authentication, and operational details.

Changes to these templates need a backend deployment to affect new emails. Already queued messages retain the wording saved when they were created.
