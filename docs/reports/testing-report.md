# Testing and validation report

Branch: **intern/07-muthukumaran-k** · Checked: **2026-10-02**

## Results from this run

| Layer | Result | Scope |
|---|---:|---|
| Backend pytest | **648 passed** | SQLite locally; real Tesseract installed, no OCR skips |
| Frontend Vitest | **148 passed** | Components, API client, account/reset workflows and charts |
| ML pytest | **31 passed** | OCR parser and refill evaluation regressions |
| Chromium Playwright | **4 passed** | Real local Django API and React app, including mobile viewport |
| Total | **831 passed** | No failing or skipped tests in these runs |

Backend combined statement/branch coverage of `apps`: **91%** (rounded;
5,025 statements, 984 branches). Ruff, Black, isort, ESLint and Prettier pass.
Django reports no system-check issues and no missing migrations. The production
SPA and independently bundled Firebase messaging service worker compile.

The baseline inherited at `f4e9167` passed 635 backend, 142 frontend and 31 ML tests
before changes. Existing features were retained and verified rather than presented
as newly authored. See [branch-readiness.md](branch-readiness.md) for the changes.

## Scenarios checked

- The API integration test covers registration/JWT, caregiver invitation and
  consent, a prescription image through real OCR and review, medicine/schedule
  creation, taken/missed doses, stock accounting, caregiver alerts, refill
  predictions, adherence reports/CSV and administrative dashboards. It checks
  other-patient isolation and role boundaries.
- Browser workflows cover registration, typed prescription extraction and manual
  stock review, saving medicines, taking a dose, medication history, refills,
  adherence and logout. A schedule is adjusted through the authenticated API to
  keep this test independent of the time of day; the prescription review itself
  is exercised through the UI.
- Separate browser cases verify the caregiver patient list and forbidden admin
  route, administrator analytics/user management, and password-reset/notification
  pages on a 390 px viewport without horizontal document overflow.
- Added retry tests check backoff, three-attempt exhaustion, recovery of abandoned
  queued rows, opt-out changes, provider exceptions, enabled notification channels,
  and the distinction between production failure and development simulation.
- Logout tests check device ownership, server revocation and local cleanup even
  when a network request fails. Reset UI tests check enumeration-safe responses,
  incomplete links and confirmation credentials.
- Readiness tests check database/cache outages; liveness is independent of the
  shared rate-limit cache. Production settings reject missing Redis, secrets,
  hosts and PostgreSQL configuration.

## CI and container verification

[CI](../../.github/workflows/ci.yml) runs backend tests against PostgreSQL 16,
frontend and ML checks, repository hygiene and secret scanning, production Docker
builds, and the existing **20-check production-stack smoke test**.
[Browser workflow](../../.github/workflows/browser.yml) installs Tesseract and
Chromium, starts the real local API/app, and saves reports and failure traces.

**Docker was unavailable locally**, so the updated full production topology was
not executed in this workspace. Do not copy the reference implementation's old
20/20 container result as evidence for this commit; inspect this branch's new CI
run. Historical performance/OCR/refill reports describe their own measurements.

## Reproduce

```bash
cd backend
pip install -r requirements/dev.txt
ruff check . && black --check . && isort --check-only .
python manage.py check
python manage.py makemigrations --check --dry-run
pytest --cov=apps

cd ../frontend
npm ci
npm run lint && npm run format:check && npm test && npm run build
npx playwright install --with-deps chromium
npm run test:e2e

cd ../ml
pytest
```

Use Python 3.12, Node 22 and Tesseract. Playwright starts the demo API with `python`
by default; set `PILLSYNC_PYTHON` if your virtual environment is elsewhere. Its
SQLite demo database is ignored by git and never contains real patient data.

For the staging production stack, complete `.env.prod` from the template, then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --wait
python scripts/smoke_test.py https://your-staging-domain
```

The smoke script creates a synthetic account and exercises OCR, so use staging.

## Limits

Google and Firebase/Twilio/SendGrid credentials were not supplied. Their adapter
contracts and local flows were tested, but actual account sign-in and notification
receipt require provider-backed staging acceptance. No live cloud deployment was
made. OCR evaluations use synthetic printed prescriptions; handwriting and real
camera artifacts need field testing. Refill evaluations use simulated data. The
browser suite uses Chromium and an emulated mobile viewport, not physical phones
or every browser. No new load test or expert accessibility audit was performed.
