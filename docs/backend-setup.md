# Marc-D client portal setup

The React site lives in `frontend/` and deploys to Netlify. Django lives in `backend/` and deploys to Railway. Production uses:

- `https://marcdbycartez.com` and `https://www.marcdbycartez.com` for React
- `https://api.marcdbycartez.com` for Django
- Railway PostgreSQL for application records
- a private Railway storage bucket for uploaded files, plus a separate private file backup bucket
- Resend for invitations, resets, messages, and status notifications

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

Open `http://localhost:5173`. Django is at `http://localhost:8000`; the emergency Django admin is `/django-admin/`. Email prints to the backend terminal until a Resend key is configured.

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
RESEND_API_KEY=<Resend key>
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

After the first successful deployment:

```bash
railway ssh --service web_design --environment production
# Inside the Railway container, enter the admin password interactively:
python manage.py createsuperuser
```

Use your admin email. The custom dashboard is `/dashboard`; Django Admin is a read-only inspection surface; use the portal for business changes.

## 5. Private Railway uploads

The production project has private `client-uploads` and `client-upload-backups` buckets in US East. Use the reference variables above; never copy their actual credentials into local scripts. Google Cloud and Cloudflare accounts are not required for file storage. Legacy GCS code remains available only for existing integrations.

Contacts, URLs, project answers, appointments, messages, and file ownership metadata live in PostgreSQL. Image and PDF bytes live in the private upload bucket. Temporary signed PUT/GET links expire after ten minutes. The backend checks the stored length, declared type, magic bytes, and image decoding before copying the verified bytes to a new random `files/` key. The original upload link cannot overwrite the accepted file. A second copy with the same key must succeed in the private backup bucket before the database marks the asset uploaded.

Railway storage currently has no object versioning, lifecycle rules, or object locks. The second bucket protects against an accidental primary-object loss; it is not protection against compromise of the Railway project or both bucket credentials. No permanent deletion job is enabled. Pending/rejected uploads remain private and consume storage until an approved cleanup policy is implemented. Browser CORS is limited to the two site HTTPS origins and the localhost/127.0.0.1 development origins on port 5173. Real PNG and PDF signed uploads, verified backup bytes, authorized downloads, and denial of unsigned downloads were checked in Railway on October 2, 2026. The actual frontend intake flow must also be checked before launch.

To recover a missing accepted file, look up its `object_name` in the asset record, read that exact key from `client-upload-backups`, and restore the bytes to the primary bucket without changing ownership or object names. Verify size/type and a checksum before declaring recovery complete. Recover PostgreSQL separately using PITR or a volume backup. Do not restore over production as a test.

## 6. Resend and Turnstile

In Resend:

1. Add and verify `marcdbycartez.com`.
2. Add the DNS records Resend provides.
3. Create a restricted production API key.
4. Confirm the `DEFAULT_FROM_EMAIL` sender uses the verified domain.

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

Railway PostgreSQL point-in-time recovery is enabled. Daily, weekly, and monthly volume snapshots are scheduled. A manual snapshot completed on October 2, 2026 at 22:54 Eastern (222 MB). The private PITR archive bucket is separate from both client-file buckets; do not repurpose it.

Database backups cover records and asset references, not client-file bytes. Every newly accepted Railway upload is separately copied to `client-upload-backups` before being marked complete. Both copies are in the same Railway project and region. A restore drill into an isolated environment remains required before launch; never restore over production to test recovery. Check backups after schema deployments and after changing retention or storage settings.

## 11. Production smoke test

1. Visit the public site and submit a brief with image and PDF files.
2. Book one visible appointment; verify a duplicate cannot be booked.
3. Sign in as admin, review the brief, and send the invitation.
4. Open the invitation once, choose a strong password, and confirm reuse fails.
5. As the client, view only that client's project, upload an asset, send a message, and book/cancel an appointment.
6. As admin, reply, change project status, block a date, and confirm the public calendar updates.
7. Verify invitation, password-reset, message, and status emails in Resend.
8. Confirm assets are private in Railway and only short-lived signed downloads work.

## Redesign additions (October 2026)

The frontend uses React Router prerendering. Netlify publishes **`dist/client`** with Node 22. The single public landing page has prerendered HTML, metadata, a canonical link, and a sitemap entry. Former public routes redirect to its section anchors. Private routes use `__spa-fallback.html` and `noindex`. Production `VITE_SITE_URL` is `https://marcdbycartez.com`, with the API at `https://api.marcdbycartez.com/api/v1`. Keeping the API on a subdomain of that same registrable domain allows secure SameSite=Lax session cookies to work. Netlify preview domains need their own same-site API proxy or a dedicated test setup; do not weaken production cookie settings to support them.

The development Vite server proxies `/api` to `127.0.0.1:8000`, so leave `VITE_API_BASE_URL=/api/v1` locally. Run the frontend at `http://127.0.0.1:5173`. Add this exact origin to `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` when using a directly addressed API. `npm --prefix frontend run preview` serves the actual built files at `http://127.0.0.1:4173`, including private-route fallbacks, and proxies local API requests. The preview server is only for local verification.

### Upload limits and storage lifecycle

An inquiry and all its linked project attachments share one quota: **12 active files, 5 MiB per file, 25 MiB combined**. The UI labels these limits MB. Accepted formats are JPG/JPEG, PNG, WebP, and PDF. Reservation retries reuse a UUID and do not consume a second slot. Pending reservations expire after 20 minutes. Upload and download URLs last 10 minutes; a guest intake upload token lasts one hour. Clients can continue adding files after accepting their invitation.

The signed PUT requires the declared MIME type and exact content length. Finalization verifies the actual object size and signature; images also undergo decoding and a dimension check. The validated object generation is copied from `pending/` to an immutable random `files/` key. This prevents an unexpired PUT URL from overwriting an accepted file. Downloads are attachments, never public object URLs.

Railway does not currently support native lifecycle rules. There is no pending-object cleanup job enabled. Soft-deleted accepted objects are retained until a separately approved retention/deletion process is defined. No permanent client-file deletion job is enabled. Verify browser CORS and signed content-length uploads against a staging bucket before launch, including Safari and a 5 MiB boundary file.

### Calendar and email operations

Business availability is entered in the admin portal in America/New_York. Public booking, email confirmations, guest booking management and client/admin portals all display Eastern time (EST/EDT), using America/New_York for daylight-saving changes. Visitors cannot select a different time zone. Calendar downloads preserve the correct appointment instant; calendar applications may display it in their own configured zone. There is a 60-day booking window and 30-minute consultation length. Pending requests reserve their slot, and the admin confirms them. Cancellations release slots. A signed 90-day management link lets a guest reschedule, cancel, or download an ICS entry. There is no Google/Outlook calendar sync. Admins must keep website availability aligned with their other commitments. Production deployment no longer seeds default hours.

All invitation, password-reset, inquiry, message, project-status, and booking notifications use the `EmailDelivery` outbox. Configure a separate Railway cron service, rooted at `backend`, to run `python manage.py retry_emails` every five minutes. Give it the runtime database URL and email credentials; no migration credentials, web health check, or web start command. It exits after a bounded batch. Railway runs the configured start command on schedule; see [Railway cron documentation](https://docs.railway.com/cron-jobs). Monitor unsent rows and retry failures. After ten attempts, investigate before resetting attempts. A crash after the provider accepts a message but before the database records success can cause a duplicate; delivery is not exactly-once.

Set `TRUST_RAILWAY_PROXY=true` only on a backend reached through Railway's public edge, where `X-Real-IP` is provided by the proxy. Keep it false for direct local servers. This is used for authentication throttling, public forms, Turnstile and audit records; arbitrary `X-Forwarded-For` is not trusted. Verify with your actual ingress topology before launch. [Railway request headers](https://docs.railway.com/networking/public-networking/specs-and-limits).

### Test isolation and launch status

Use this command for the default isolated tests:

```bash
backend/.venv/bin/python backend/manage.py test api --settings=config.test_settings --noinput
```

This explicitly selects an in-memory SQLite test database and disables external email/storage credentials. The two concurrency tests require PostgreSQL and skip on SQLite. For PostgreSQL, create a disposable local cluster and a separate settings module importing `config.test_settings`, overriding only `DATABASES` with that cluster and a test database name. Never point tests at Railway production. The implementation was also tested against a private local PostgreSQL 17 cluster, including concurrent booking and upload reservation tests.

Before launch, connect Railway, verify the final domain, supply Resend and the chosen bot-protection settings, configure actual business hours and the email retry cron, review the forward migrations, verify a backup, and approve the production deployment. Test real email delivery, invitation/reset links, cross-subdomain cookies, the Railway browser upload/download flow, and calendar downloads in staging. Analytics is intentionally absent. The backend is being deployed separately from the frontend; consult the Railway deployment status and provider verification results before accepting real client submissions. Production DNS, admin sign-in, email delivery, bot protection, and actual business hours must be completed before launch.

### Verified Railway deployment (October 2, 2026)

Project: `compassionate-amazement`, production environment, backend service `web_design`. The generated HTTPS URL is `https://webdesign-production-9e10.up.railway.app`; `/api/v1/health/` returns `{"status":"ok"}` and checks the database. The approved restricted PostgreSQL roles are active. Private `client-uploads` and `client-upload-backups` buckets are connected by Railway variable references.

The actual production-built frontend was tested through an isolated local preview bridge to Railway: intake modal → required contact details → project answers/URLs → PNG and PDF file picker → successful saved confirmation. Contact details, both URLs, goal/features/notes, and two uploaded asset records were verified in PostgreSQL. Primary and backup file bytes had matching checksums. Unsigned downloads returned 403. No frontend warning/error logs appeared in this flow. Temporary browser test access was removed. A clearly marked “Railway Storage QA” brief and tiny diagnostic objects remain as verification evidence; they are not real client data.

The domain's authoritative nameservers are now `dns1.p04.nsone.net` through `dns4.p04.nsone.net` (Netlify DNS). The API CNAME `api` → `2c46dxbl.up.railway.app` and Railway's `_railway-verify.api` ownership TXT record are saved. Existing Microsoft 365 MX, SPF, tenant verification, autodiscover, DKIM, and DMARC records were copied from the previous GoDaddy DNS zone and confirmed against the new authoritative nameserver and public resolvers.

Netlify production deployment `6ac078ff1eb252488d185e38` published commit `68e09bf` from `resigned`. Its generated HTTPS URL is `https://marcdbycartez.netlify.app`. The deployed HTML, canonical URL, structured data, robots/sitemap, sign-in route, and intake modal were verified. The production bundle contains the custom API URL. The primary domain `https://marcdbycartez.com` has a valid automatically renewing Let's Encrypt certificate; `https://www.marcdbycartez.com` redirects to it with HTTP 301. Railway confirms API ownership and propagated routing. API HTTPS now passes certificate validation and returns HTTP 200 for health, CSRF/form guard, and unauthenticated session checks. Responses permit credentials from the exact production frontend origin and set Secure, SameSite=Lax CSRF cookies for `.marcdbycartez.com`.

Netlify's authoritative nameservers, Cloudflare's public resolver, and Google's public resolver all return the new records. The local system resolver still intermittently returns the former GoDaddy site and caches a missing API name. The new homepage was displayed on the real domain before that stale resolution recurred. Domain HTTPS checks used `curl --resolve` with the authoritative destination addresses and full certificate validation; no certificate checks were bypassed. Repeat the final browser intake/sign-in flow on the custom domain once the local/ISP DNS caches expire. Email keys, the first admin account, real business hours, an outbox retry job, and a recovery drill remain before a complete launch.
