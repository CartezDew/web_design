# Cartez Dewberry — business website and client portal

A single-page scrolling React website with a Django API, public project intake, private client/admin portal, and consultation booking. The frontend stays on Netlify; the backend runs on Railway/PostgreSQL with private Railway file storage, separate upload backup copies, and built-in form spam checks. Resend email setup is still required.

## Run locally

Use Node 22 and Python 3.11+. The frontend uses plain JSX and CSS, with no styling framework to learn.

```bash
npm --prefix frontend install
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python backend/manage.py migrate
backend/.venv/bin/python backend/manage.py createsuperuser
backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:8000
```

In another terminal:

```bash
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`. With no backend `.env`, Django uses local SQLite and console email. Choose your real consultation hours in `/dashboard/availability`; no default production hours are inserted. Local file transfer needs private S3-compatible bucket settings; production uses Railway storage. Briefs can save before optional file transfer succeeds.

## Where to edit

- [Editing guide](docs/editing-guide.md): section-by-section file map and common changes.
- [Backend and deployment setup](docs/backend-setup.md): environment variables, storage, sessions, email retries, migrations, and launch checks.
- `frontend/src/sections/`: homepage sections, each with its own `.jsx` and `.css`.
- `frontend/src/pages/`: inline project intake and booking components, each with matching CSS. These forms render on the landing page.
- `frontend/src/portal/`: authentication, dashboard, project, messaging, appointment, availability, and profile interfaces.
- `frontend/src/content/stories.js`: expandable project stories.
- `frontend/src/content/site.js`: services, packages, portfolio metadata, and FAQs.
- `frontend/src/styles/tokens.css`: brand colors, fonts, widths, and spacing.

## Verify

```bash
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run preview
backend/.venv/bin/python backend/manage.py test api --settings=config.test_settings --noinput
backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run --settings=config.test_settings
```

The production preview runs at `http://127.0.0.1:4173`. It serves prerendered HTML and forwards API requests to the local Django server. PostgreSQL concurrency tests are skipped on SQLite; run them on a disposable PostgreSQL database before deployment.

The Railway backend is deployed with private uploads, separate runtime/migration database roles, database PITR, and scheduled daily/weekly/monthly backups. A real browser intake with PNG and PDF files was verified against Railway, including matching backup checksums and private downloads. Final API DNS, frontend deployment, admin setup, email delivery, and real consultation hours remain launch tasks. Analytics is deferred.
