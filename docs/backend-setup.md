# Marc-D client portal setup

The React site lives in `frontend/` and deploys to Netlify. Django lives in `backend/` and deploys to Railway. Production uses:

- `https://marcdbycartez.com` and `https://www.marcdbycartez.com` for React
- `https://api.marcdbycartez.com` for Django
- Railway PostgreSQL for application records
- a private Railway storage bucket for uploaded files, plus a separate private file backup bucket
- the existing Microsoft 365 mailbox, through Graph, for invitations, resets, messages, and status notifications

Never paste production secrets into source files, chat prompts, screenshots, or terminal commands that will be committed.

## 1. Run locally

Requirements: Node 22+, Python 3.11+, and PostgreSQL 15+.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
npm --prefix frontend install
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

In a second terminal, from the repository root:

```bash
npm --prefix frontend run dev
```

Open `http://localhost:5173`. Django is at `http://localhost:8000`; the emergency Django admin is `/django-admin/`. Local email prints to the backend terminal with `EMAIL_PROVIDER=console`. Production console delivery is refused so queued messages cannot be falsely marked sent.

## 2. Create Railway services

1. Create a Railway project and add PostgreSQL.
2. Add a service from this Git repository.
3. Set its root directory to `backend`.
4. Set the commands directly in Railway Settings: pre-deploy `bash bin/release.sh`, start `bash bin/start.sh`, health check `/api/v1/health/`. This service does not load `backend/railway.json`. Migrations run during pre-deploy; static assets are collected during startup because Railway does not persist the pre-deploy container’s filesystem into the running app.
5. Generate a Railway domain initially, then add `api.marcdbycartez.com` as a custom domain.
6. At the DNS provider for `marcdbycartez.com`, create the CNAME Railway displays.
7. Wait for Railway TLS to become active before enabling the frontend production API URL.

The release process intentionally fails if `MIGRATION_DATABASE_URL` is absent. This avoids silently running schema changes through the web application's database role.

## 3. Create separate PostgreSQL roles

Run these commands using Railway's owner connection. Replace names, database, and generated passwords. Do not commit the resulting URLs.

```sql
CREATE ROLE marcd_migrator LOGIN PASSWORD 'generated-migration-password';
CREATE ROLE marcd_runtime LOGIN PASSWORD 'generated-runtime-password';

GRANT CONNECT ON DATABASE railway TO marcd_migrator, marcd_runtime;
GRANT USAGE, CREATE ON SCHEMA public TO marcd_migrator;
GRANT USAGE ON SCHEMA public TO marcd_runtime;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO marcd_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO marcd_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marcd_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO marcd_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE marcd_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO marcd_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE marcd_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO marcd_runtime;

REVOKE CREATE ON SCHEMA public FROM marcd_runtime;
```

Before the first role-separated deployment, the migrator must own or be allowed to alter existing Django tables. If the Railway owner created the first migration, transfer table/sequence ownership to `marcd_migrator` during a maintenance window.

Set:

- `DATABASE_URL`: connection URL for `marcd_runtime`; the web process uses this.
- `MIGRATION_DATABASE_URL`: connection URL for `marcd_migrator`; only `release.sh` uses it and `start.sh` removes it from the Gunicorn environment.

Railway variables are still visible to project administrators. Restrict Railway project access and rotate both passwords when staff access changes.

## 4. Railway environment

Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.

```text
DJANGO_ENV=production
DEBUG=false
SECRET_KEY=<generated 50+ character secret>
DATABASE_URL=<runtime PostgreSQL URL>
MIGRATION_DATABASE_URL=<migration PostgreSQL URL>
ALLOWED_HOSTS=api.marcdbycartez.com,webdesign-production-9e10.up.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS=https://marcdbycartez.com,https://www.marcdbycartez.com
CSRF_TRUSTED_ORIGINS=https://marcdbycartez.com,https://www.marcdbycartez.com
CSRF_COOKIE_DOMAIN=.marcdbycartez.com
FRONTEND_URL=https://marcdbycartez.com
SECURE_SSL_REDIRECT=true
DEFAULT_FROM_EMAIL=Cartez Dewberry <letsbuild@marcdbycartez.com>
ADMIN_NOTIFICATION_EMAIL=letsbuild@marcdbycartez.com
EMAIL_PROVIDER=microsoft365
MICROSOFT_CLIENT_ID=<public Application client ID>
MICROSOFT_TENANT_ID=<public Directory tenant ID>
MICROSOFT_MAILBOX=letsbuild@marcdbycartez.com
MICROSOFT_TOKEN_ENCRYPTION_KEY=<private Fernet key stored only in Railway>
MICROSOFT_CLIENT_CERTIFICATE_KEY=<private PEM signing key stored only in Railway>
MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT=<public SHA-1 certificate thumbprint>
MICROSOFT_AUTH_REDIRECT_URI=https://api.marcdbycartez.com/api/v1/email/microsoft/callback/
UPLOAD_STORAGE_BACKEND=s3
UPLOAD_BACKUP_REQUIRED=true
S3_ADDRESSING_STYLE=virtual
S3_ENDPOINT_URL=${{client-uploads.ENDPOINT}}
S3_BUCKET_NAME=${{client-uploads.BUCKET}}
S3_REGION=${{client-uploads.REGION}}
S3_ACCESS_KEY_ID=${{client-uploads.ACCESS_KEY_ID}}
S3_SECRET_ACCESS_KEY=${{client-uploads.SECRET_ACCESS_KEY}}
S3_BACKUP_ENDPOINT_URL=${{client-upload-backups.ENDPOINT}}
S3_BACKUP_BUCKET_NAME=${{client-upload-backups.BUCKET}}
S3_BACKUP_REGION=${{client-upload-backups.REGION}}
S3_BACKUP_ACCESS_KEY_ID=${{client-upload-backups.ACCESS_KEY_ID}}
S3_BACKUP_SECRET_ACCESS_KEY=${{client-upload-backups.SECRET_ACCESS_KEY}}
NATIVE_FORM_PROTECTION=true
TURNSTILE_REQUIRED=false
# Optional future Turnstile setup:
TURNSTILE_SECRET_KEY=
```

The owner website admin is `letsbuild@marcdbycartez.com`. Its record has the portal `admin` role, no Django superuser/staff access, and a password set by the owner after the verified setup email. To reset it later, use **Forgot password** on `/sign-in` and let the owner set their own password from the emailed link. Never put an owner password into chat, source, or an agent command.

For a separate emergency Django administrator, only if one is needed:

```bash
railway ssh --service web_design --environment production
# Inside the Railway container, enter the admin password interactively:
/opt/venv/bin/python manage.py createsuperuser
```

Use your admin email. The custom dashboard is `/dashboard`; Django Admin is a read-only inspection surface; use the portal for business changes.

## 5. Private Railway uploads

The production project has private `client-uploads` and `client-upload-backups` buckets in US East. Use the reference variables above; never copy their actual credentials into local scripts. Google Cloud and Cloudflare accounts are not required for file storage. Legacy GCS code remains available only for existing integrations.

Contacts, URLs, project answers, appointments, messages, and file ownership metadata live in PostgreSQL. Image and PDF bytes live in the private upload bucket. Temporary signed PUT/GET links expire after ten minutes. The backend checks the stored length, declared type, magic bytes, and image decoding before copying the verified bytes to a new random `files/` key. The original upload link cannot overwrite the accepted file. A second copy with the same key must succeed in the private backup bucket before the database marks the asset uploaded.

Railway storage currently has no object versioning, lifecycle rules, or object locks. The second bucket protects against an accidental primary-object loss; it is not protection against compromise of the Railway project or both bucket credentials. No permanent deletion job is enabled. Pending/rejected uploads remain private and consume storage until an approved cleanup policy is implemented. Browser CORS is limited to the two site HTTPS origins and the localhost/127.0.0.1 development origins on port 5173. Real PNG and PDF signed uploads, verified backup bytes, authorized downloads, and denial of unsigned downloads were checked in Railway on October 2, 2026. The actual frontend intake with PNG and PDF files was verified against Railway; repeat the complete client flow after material changes.

To recover a missing accepted file, look up its `object_name` in the asset record, read that exact key from `client-upload-backups`, and restore the bytes to the primary bucket without changing ownership or object names. Verify size/type and a checksum before declaring recovery complete. Recover PostgreSQL separately using PITR or a volume backup. Do not restore over production as a test.

## 6. Microsoft 365 email and form protection

Microsoft authentication happens in the owner's normal browser; signing in through the Codex browser is unnecessary. This connection sends through the existing Microsoft 365 mailbox and preserves its Microsoft/GoDaddy DNS records. It needs no Resend account, SMTP password, or application client secret.

In the owner's signed-in browser:

1. Open [Microsoft Entra](https://entra.microsoft.com), then **Entra ID → App registrations → New registration**.
2. Name it **Marc'd by Cartez Website Email**. Choose **Accounts in this organizational directory only**.
3. In **API permissions**, add **Microsoft Graph → Delegated permissions → Mail.Send**. Remove the default `User.Read` permission. Do not add application-wide mailbox permissions.
4. In **Authentication → Add a platform → Web**, register `https://api.marcdbycartez.com/api/v1/email/microsoft/callback/`. The production flow is a confidential web client; it does not need public-client flows enabled.
5. In **Certificates & secrets → Certificates**, upload the generated public `.cer` certificate. Its private signing key stays in Railway as `MICROSOFT_CLIENT_CERTIFICATE_KEY`; the matching public fingerprint is `MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT`. Never upload or share the private PEM key. The initial certificate expires October 3, 2027; replace the certificate/key pair before expiry and test refresh/delivery afterward.
6. From **Overview**, copy the **Application (client) ID** and **Directory (tenant) ID** into the corresponding Railway variables. These identifiers are public; passwords, access tokens, and refresh tokens are private. If app registration or consent is blocked by tenant policy, the Microsoft 365 administrator must enable the specific app/permission; do not weaken MFA or tenant security defaults.

The server uses a tenant-specific MSAL confidential client authenticated by its certificate and requests delegated `Mail.Send`, plus MSAL's standard sign-in/refresh scopes. This grants sending access for the signed-in mailbox, with no inbox-reading or calendar permissions. The backend accepts only an account whose username matches `MICROSOFT_MAILBOX`. See [Microsoft's authorization-code documentation](https://learn.microsoft.com/en-us/entra/msal/python/getting-started/acquiring-tokens#acquire-token-by-authorization-code-flow).

The initial device-code attempt was blocked by Microsoft error 530035 because this tenant enforces Security Defaults. Microsoft now blocks device-code flows under that protection. Keep Security Defaults/MFA enabled and use the browser authorization-code flow instead; registering the owner's Mac is not the fix. The device-code command has been replaced by the browser authorization flow. [Microsoft Security Defaults](https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults#block-device-code-flow).

Generate a Fernet encryption key privately and store it in `MICROSOFT_TOKEN_ENCRYPTION_KEY` on the backend. Reference that same Railway variable from the email worker; do not generate a new key during each deploy. Keep an access-controlled recovery copy separately from the database backup. Changing or losing the key requires mailbox reauthorization.

After deployment, run in the Railway backend container:

```bash
/opt/venv/bin/python manage.py authorize_microsoft_email
```

The command displays a Microsoft authorization link valid for 15 minutes. The owner opens it in their normal browser, signs in as `letsbuild@marcdbycartez.com`, and reviews/approves sending permission. Microsoft posts the one-use authorization code to the registered HTTPS callback; it is not placed in URL query strings or pasted into chat. MSAL validates state, nonce, and PKCE. The backend atomically claims each encrypted authorization attempt once, outside request-wide transactions, then contacts Microsoft without holding database locks. Invalid/expired/replayed state and a different mailbox cannot save credentials. Callback pages contain no tokens/provider errors and use no-store/noindex/no-referrer headers.

The successful authorization cache is encrypted in PostgreSQL, outside dashboard/admin/API exposure. The backend and worker share it and silently refresh access using the certificate; concurrent refreshes cannot overwrite a newer cache. Revoked consent, changed registrations, or tenant sign-in policies can require the owner to run the same authorization command again.

Test delivery to the owner before enabling the scheduled worker. Graph HTTP 202 means provider acceptance, not confirmed inbox delivery; verify the actual received message and password-reset link. Messages are saved to the mailbox's Sent Items. See [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0). Resend remains a supported optional provider with `EMAIL_PROVIDER=resend` and its API key, but is not the selected production service.

The current site uses built-in form protection: a signed, expiring form-start token, a one-second minimum form age, a hidden spam-trap field, and a shared PostgreSQL limit of ten public submissions per IP per hour. These are lightweight checks, not a CAPTCHA or a guarantee against sophisticated bots. Login has separate persistent limits. Keep `TRUST_RAILWAY_PROXY=true` only behind the Railway edge.

If adding Cloudflare Turnstile later:

1. Create a widget for `marcdbycartez.com`, `www.marcdbycartez.com`, and localhost for development.
2. Put the secret in Railway as `TURNSTILE_SECRET_KEY`.
3. Put the public site key in Netlify as `VITE_TURNSTILE_SITE_KEY`, and set `TURNSTILE_REQUIRED=true` in Railway only after both keys are configured.

## 7. Netlify

The production Netlify project is `marcdbycartez` in the `cartezdew` team (Marc-d Group LLC), connected to `CartezDew/web_design` on the `resigned` branch. Auto publishing is enabled for that branch. The root `netlify.toml` sets:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist/client`
- Node version: 22

Leave the Netlify UI base directory set to `frontend` if it asks. The publish directory stays `dist/client`, relative to `frontend`.

Set:

```text
VITE_API_BASE_URL=https://api.marcdbycartez.com/api/v1
VITE_SITE_URL=https://marcdbycartez.com
VITE_TURNSTILE_SITE_KEY=
```

Add `marcdbycartez.com` and `www.marcdbycartez.com` as custom domains. `netlify.toml` provides SPA redirects so `/sign-in`, invitation links, password-reset links, and dashboard routes load directly.

## 8. Safe deployment procedure

Before each production schema migration:

1. Read the generated migration and inspect `python manage.py sqlmigrate APP MIGRATION`.
2. Run all backend and frontend tests locally.
3. Confirm the latest backup completed and perform a periodic restore drill into a temporary database.
4. Deploy. `release.sh` sets `ALLOW_PRODUCTION_MIGRATIONS=yes` only around `migrate`.
5. Check `/api/v1/health/`, sign in, submit a test intake, and inspect Railway logs.

The production `flush` command is disabled. Production `migrate` refuses to run unless its one-process approval variable is present. The runtime role lacks schema creation and truncate privileges. Business records are soft-deleted and privileged changes are audited. The Cursor rule adds guidance for future AI work, but permissions and backups are the actual recovery boundary.

## 9. Verification commands

Run these before deployment:

```bash
npm --prefix frontend test
npm --prefix frontend run build
backend/.venv/bin/python backend/manage.py test api --settings=config.test_settings --noinput
backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
backend/.venv/bin/python backend/manage.py check
```

## 10. Backups and restore drills

Railway PostgreSQL point-in-time recovery is enabled. Daily, weekly, and monthly volume snapshots are scheduled. Manual snapshots completed on October 2, 2026 at 22:54 Eastern (222 MB) and October 3 at 00:13 Eastern (259 MB), the latter before the additive Microsoft email credential migration. Another snapshot completed at 00:47 Eastern (267 MB) before the browser-authorization table migration. The private PITR archive bucket is separate from both client-file buckets; do not repurpose it.

Database backups cover records and asset references, not client-file bytes. Every newly accepted Railway upload is separately copied to `client-upload-backups` before being marked complete. Both copies are in the same Railway project and region. A restore drill into an isolated environment remains required before launch; never restore over production to test recovery. Check backups after schema deployments and after changing retention or storage settings.

## 11. Production smoke test

1. Visit the public site and submit a brief with image and PDF files.
2. Book one visible appointment; verify a duplicate cannot be booked.
3. Sign in as admin, review the brief, and send the invitation.
4. Open the invitation once, choose a strong password, and confirm reuse fails.
5. As the client, view only that client's project, upload an asset, send a message, and book/cancel an appointment.
6. As admin, reply, change project status, block a date, and confirm the public calendar updates.
7. Verify invitation, password-reset, message, and status emails are received through Microsoft 365, including booking calendar attachments.
8. Confirm assets are private in Railway and only short-lived signed downloads work.

## Redesign additions (October 2026)

The frontend uses React Router prerendering. Netlify publishes **`dist/client`** with Node 22. The single public landing page has prerendered HTML, metadata, a canonical link, and a sitemap entry. Former public routes redirect to its section anchors. Private routes use `__spa-fallback.html` and `noindex`. Production `VITE_SITE_URL` is `https://marcdbycartez.com`, with the API at `https://api.marcdbycartez.com/api/v1`. Keeping the API on a subdomain of that same registrable domain allows secure SameSite=Lax session cookies to work. Netlify preview domains need their own same-site API proxy or a dedicated test setup; do not weaken production cookie settings to support them.

The development Vite server proxies `/api` to `127.0.0.1:8000`, so leave `VITE_API_BASE_URL=/api/v1` locally. Run the frontend at `http://127.0.0.1:5173`. Add this exact origin to `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` when using a directly addressed API. `npm --prefix frontend run preview` serves the actual built files at `http://127.0.0.1:4173`, including private-route fallbacks, and proxies local API requests. The preview server is only for local verification.

### Upload limits and storage lifecycle

An inquiry and all its linked project attachments share one quota: **12 active files, 5 MiB per file, 25 MiB combined**. The UI labels these limits MB. Accepted formats are JPG/JPEG, PNG, WebP, and PDF. Reservation retries reuse a UUID and do not consume a second slot. Pending reservations expire after 20 minutes. Upload and download URLs last 10 minutes; a guest intake upload token lasts one hour. Clients can continue adding files after accepting their invitation.

The signed PUT requires the declared MIME type and exact content length. Finalization verifies the actual object size and signature; images also undergo decoding and a dimension check. The validated object generation is copied from `pending/` to an immutable random `files/` key. This prevents an unexpired PUT URL from overwriting an accepted file. Downloads are attachments, never public object URLs.

Railway does not currently support native lifecycle rules. There is no pending-object cleanup job enabled. Soft-deleted accepted objects are retained until a separately approved retention/deletion process is defined. No permanent client-file deletion job is enabled. Verify browser CORS and signed content-length uploads against a staging bucket before launch, including Safari and a 5 MiB boundary file.

### Calendar and email operations

Business availability is edited in `/dashboard/availability` in America/New_York. The owner's initial hours are saved: Monday–Friday 10:30 AM–8 PM and Saturday–Sunday noon–9 PM, with 30-minute slots. Public booking, email confirmations, guest booking management and client/admin portals all display Eastern time (EST/EDT), using America/New_York for daylight-saving changes. Visitors cannot select a different time zone. Calendar downloads preserve the correct appointment instant; calendar applications may display it in their own configured zone. There is a 60-day booking window and 30-minute consultation length. New requests hold the slot for up to one hour, capped at the appointment start. The customer must press **Confirm appointment** from their email before the appointment becomes confirmed. Pending slots are released after the hold expires, while the request remains in the dashboard as expired. Rescheduling requires a fresh confirmation, invalidating the earlier link. Cancellations release slots. A signed 90-day management link lets a guest reschedule, cancel, or download an ICS entry after confirmation. There is no Google/Outlook calendar sync. Admins must keep website availability aligned with their other commitments. Production deployment does not overwrite manually entered hours.

All invitation, password-reset, inquiry, message, project-status, and booking notifications use the `EmailDelivery` outbox. A separate Railway service named `email-delivery` is connected to `CartezDew/web_design` on `resigned` and scheduled every five minutes, with root `/backend`, builder Railpack, start command `python manage.py retry_emails`, empty pre-deploy commands, no health check, no public domain, and restart policy Never. Configure these directly in Railway service settings; new services cannot opt into the deprecated `railway.json`/`railway.toml` configuration. The web service retains its existing settings. The worker has no migration credentials or storage keys.

The worker references the backend's runtime `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, sender/notification addresses, and Microsoft client/tenant/encryption/certificate settings; use `DJANGO_ENV=production`, `DEBUG=false`, `EMAIL_PROVIDER=microsoft365`, and the configured mailbox. Mailbox authorization, the received admin setup email, a usable owner password, the native `*/5 * * * *` schedule, and an initial worker run processing zero queued messages were verified on October 3. The worker exits after a batch of at most 100 queued messages; HTTP requests have timeouts, and authorization is checked before consuming retry attempts. Railway runs the start command on schedule; see [Railway cron documentation](https://docs.railway.com/cron-jobs). Monitor unsent rows and retry failures. After ten attempts, investigate before resetting attempts. A crash after the provider accepts a message but before the database records success can cause a duplicate; delivery is not exactly-once.

`retry_emails --exclude DELIVERY_UUID` leaves a specific message queued without changing its recipient, attempts, or sent status. The earlier storage verification generated two setup-only messages: an example-domain client confirmation (`63c92d10-c086-410d-b2ca-e7a384cf9a76`) and an owner QA brief notification (`6ef4e707-2c97-4dcb-ae5e-f2035c8fd81b`). Both are excluded using repeatable `--exclude` arguments in the production worker's start command; ordinary client notifications continue to retry. This exclusion does not delete the verification evidence or mark an unsent message as delivered.

Set `TRUST_RAILWAY_PROXY=true` only on a backend reached through Railway's public edge, where `X-Real-IP` is provided by the proxy. Keep it false for direct local servers. This is used for authentication throttling, public forms, Turnstile and audit records; arbitrary `X-Forwarded-For` is not trusted. Verify with your actual ingress topology before launch. [Railway request headers](https://docs.railway.com/networking/public-networking/specs-and-limits).

### Test isolation and launch status

Use this command for the default isolated tests:

```bash
backend/.venv/bin/python backend/manage.py test api --settings=config.test_settings --noinput
```

This explicitly selects an in-memory SQLite test database and disables external email/storage credentials. The three concurrency tests require PostgreSQL and skip on SQLite. For PostgreSQL, create a disposable local cluster and a separate settings module importing `config.test_settings`, overriding only `DATABASES` with that cluster and a test database name. Never point tests at Railway production. The implementation was also tested against a private local PostgreSQL 17 cluster, including concurrent booking, upload reservation, and duplicate email-confirmation tests.

Microsoft authorization, received admin setup email, usable owner password, and the five-minute retry worker are verified. Complete the isolated recovery drill and final custom-domain browser sign-in/intake/booking checks. Review forward migrations and verify a fresh backup before schema deployments. GA4 uses the consent-gated public-site integration and optional server conversions described in [analytics setup](analytics.md). DNS/TLS, private uploads, native form protection, the portal admin record, and owner-provided business hours have been configured; the owner completed password setup; an independent full browser portal walkthrough remains a launch check.

### Verified Railway deployment (October 2, 2026)

Project: `compassionate-amazement`, production environment, backend service `web_design`. The generated HTTPS URL is `https://webdesign-production-9e10.up.railway.app`; `/api/v1/health/` returns `{"status":"ok"}` and checks the database. The approved restricted PostgreSQL roles are active. Private `client-uploads` and `client-upload-backups` buckets are connected by Railway variable references.

The actual production-built frontend was tested through an isolated local preview bridge to Railway: intake modal → required contact details → project answers/URLs → PNG and PDF file picker → successful saved confirmation. Contact details, both URLs, goal/features/notes, and two uploaded asset records were verified in PostgreSQL. Primary and backup file bytes had matching checksums. Unsigned downloads returned 403. No frontend warning/error logs appeared in this flow. Temporary browser test access was removed. A clearly marked “Railway Storage QA” brief and tiny diagnostic objects remain as verification evidence; they are not real client data.

The domain's authoritative nameservers are now `dns1.p04.nsone.net` through `dns4.p04.nsone.net` (Netlify DNS). The API CNAME `api` → `2c46dxbl.up.railway.app` and Railway's `_railway-verify.api` ownership TXT record are saved. Existing Microsoft 365 MX, SPF, tenant verification, autodiscover, DKIM, and DMARC records were copied from the previous GoDaddy DNS zone and confirmed against the new authoritative nameserver and public resolvers.

Netlify production deployment `6ac078ff1eb252488d185e38` published commit `68e09bf` from `resigned`. Its generated HTTPS URL is `https://marcdbycartez.netlify.app`. The deployed HTML, canonical URL, structured data, robots/sitemap, sign-in route, and intake modal were verified. The production bundle contains the custom API URL. The primary domain `https://marcdbycartez.com` has a valid automatically renewing Let's Encrypt certificate; `https://www.marcdbycartez.com` redirects to it with HTTP 301. Railway confirms API ownership and propagated routing. API HTTPS now passes certificate validation and returns HTTP 200 for health, CSRF/form guard, and unauthenticated session checks. Responses permit credentials from the exact production frontend origin and set Secure, SameSite=Lax CSRF cookies for `.marcdbycartez.com`.

Netlify's authoritative nameservers, Cloudflare's public resolver, and Google's public resolver all return the new records. The local system resolver still intermittently returns the former GoDaddy site and caches a missing API name. The new homepage was displayed on the real domain before that stale resolution recurred. Domain HTTPS checks used `curl --resolve` with the authoritative destination addresses and full certificate validation; no certificate checks were bypassed. Repeat the final browser intake/sign-in flow on the custom domain once the local/ISP DNS caches expire. The owner admin record and initial consultation hours were subsequently saved on October 3. Microsoft authorization, admin password setup, and email delivery/retry scheduling were completed October 3. Normal API DNS and TLS resolution now work without resolver overrides. An isolated recovery drill and complete client portal walkthrough remain launch checks.

### Customer confirmation workflow (October 3, 2026)

Public submissions are saved before email confirmation. Owner notifications contain the submitted contact details and project answers, with a dashboard link for files as uploads finish. Customer brief acknowledgements include a 48-hour email-confirmation link and their submitted answers. Confirmation does not accept a scope, contract, or payment. Project creation from a brief and project status changes require its verified email. The admin can review files and contact the customer immediately, and resend a fresh brief confirmation after a one-hour cooldown.

Consultation requests email both parties immediately, show the selected date/time in Eastern time (EST/EDT), and hold the slot for up to one hour. Confirmation books the call and sends its final details and ICS attachment. Pending calls cannot download a calendar entry. Expired holds release the slot without deleting any request. The retry worker marks expired requests, and the calendar also excludes expired holds immediately, even between worker runs.

Confirmation links use separate signed capabilities tied to a private rotating record nonce. Tokens are delivered only by email, held in URL fragments on the website, and omitted from business serializers and initial submission responses. A read-only preview never confirms; a deliberate CSRF-protected POST performs the change. Row locks serialize confirmation with cancellation/rescheduling/booking. Repeated valid confirmation is idempotent and queues one final receipt; changed contact/time invalidates previous links. [Django signing documentation](https://docs.djangoproject.com/en/5.2/topics/signing/).

Forward migrations add verification timestamps, expiry timestamps, and private nonces to briefs/appointments, with no business-record deletion. A fresh 310 MB Railway snapshot completed October 3 at 12:56 Eastern before this deployment. Existing rows are not falsely marked verified, and no historical client emails are automatically generated. The unconfirmed setup-only QA brief remains retained.
