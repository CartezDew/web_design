# Marc-D client portal setup

The React site lives in `frontend/` and deploys to Netlify. Django lives in `backend/` and deploys to Railway. Production uses:

- `https://marcdbycartez.com` and `https://www.marcdbycartez.com` for React
- `https://api.marcdbycartez.com` for Django
- Railway PostgreSQL for application records
- a private Google Cloud Storage bucket for uploaded files
- Resend for invitations, resets, messages, and status notifications

Never paste production secrets into source files, chat prompts, screenshots, or terminal commands that will be committed.

## 1. Run locally

Requirements: Node 20+, Python 3.11+, and PostgreSQL 15+.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
npm --prefix frontend install
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_availability
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
4. Railway reads `backend/railway.json`; it runs `bin/release.sh` before deployment and `bin/start.sh` for the web process.
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
ALLOWED_HOSTS=api.marcdbycartez.com
CORS_ALLOWED_ORIGINS=https://marcdbycartez.com,https://www.marcdbycartez.com
CSRF_TRUSTED_ORIGINS=https://marcdbycartez.com,https://www.marcdbycartez.com
CSRF_COOKIE_DOMAIN=.marcdbycartez.com
FRONTEND_URL=https://marcdbycartez.com
SECURE_SSL_REDIRECT=true
DEFAULT_FROM_EMAIL=Marc-D Group <noreply@marcdbycartez.com>
ADMIN_NOTIFICATION_EMAIL=info@marcdbycartez.com
RESEND_API_KEY=<Resend key>
GOOGLE_CLOUD_PROJECT=<project id>
GS_BUCKET_NAME=<private bucket name>
GS_CREDENTIALS_JSON=<single-line service account JSON>
TURNSTILE_SECRET_KEY=<Cloudflare secret>
TURNSTILE_REQUIRED=true
```

After the first successful deployment:

```bash
railway run python manage.py createsuperuser
```

Use your admin email. The custom dashboard is `/dashboard`; Django Admin is for emergency/internal maintenance.

## 5. Google Cloud Storage

1. Create a dedicated Google Cloud project and a regional bucket.
2. Disable public access and enforce public-access prevention.
3. Keep uniform bucket-level access enabled.
4. Create a service account dedicated to this backend and grant object create/read/delete access only to this bucket.
5. Create a JSON key, place the complete JSON into Railway's `GS_CREDENTIALS_JSON`, then store the downloaded key in a password manager and remove the local copy.
6. Apply browser CORS:

```bash
gcloud storage buckets update gs://YOUR_BUCKET --cors-file=backend/gcs-cors.json
```

The database stores ownership, size, MIME type, and random object names. The bucket remains private. Upload and download links expire after ten minutes. Django confirms object size, MIME type, and magic bytes before marking an upload complete.

## 6. Resend and Turnstile

In Resend:

1. Add and verify `marcdbycartez.com`.
2. Add the DNS records Resend provides.
3. Create a restricted production API key.
4. Confirm the `DEFAULT_FROM_EMAIL` sender uses the verified domain.

In Cloudflare Turnstile:

1. Create a widget for `marcdbycartez.com`, `www.marcdbycartez.com`, and localhost for development.
2. Put the secret in Railway as `TURNSTILE_SECRET_KEY`.
3. Put the public site key in Netlify as `VITE_TURNSTILE_SITE_KEY`.

## 7. Netlify

Create a Netlify site from the same repository. The root `netlify.toml` already sets:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20 or newer

Leave the Netlify UI base directory set to `frontend` if it asks. The publish directory stays `dist`, relative to `frontend`.

Set:

```text
VITE_API_BASE_URL=https://api.marcdbycartez.com/api/v1
VITE_TURNSTILE_SITE_KEY=<public site key>
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
backend/.venv/bin/python backend/manage.py test api
backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
backend/.venv/bin/python backend/manage.py check
```

## 10. Backups and restore drills

Enable Railway backups/PITR if the current plan supports them. Also schedule an encrypted daily logical backup from a trusted job:

```bash
pg_dump "$MIGRATION_DATABASE_URL" --format=custom --no-owner --file="marcd-$(date +%F).dump"
gcloud storage cp "marcd-$(date +%F).dump" gs://YOUR_PRIVATE_BACKUP_BUCKET/
```

Use a separate private backup bucket with retention/versioning and narrower credentials than the upload bucket. Never restore over production as a test. Restore into a new temporary database, run Django checks, compare record counts, verify a sample of briefs/projects/appointments, then destroy the temporary environment only after the drill is documented.

## 11. Production smoke test

1. Visit the public site and submit a brief with image and PDF files.
2. Book one visible appointment; verify a duplicate cannot be booked.
3. Sign in as admin, review the brief, and send the invitation.
4. Open the invitation once, choose a strong password, and confirm reuse fails.
5. As the client, view only that client's project, upload an asset, send a message, and book/cancel an appointment.
6. As admin, reply, change project status, block a date, and confirm the public calendar updates.
7. Verify invitation, password-reset, message, and status emails in Resend.
8. Confirm assets are private in GCS and only short-lived signed downloads work.
