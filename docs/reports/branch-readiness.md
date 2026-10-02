# PillSync fork: milestone completion and deployment readiness

Owner: **Muthukumaran K** · Branch: **intern/07-muthukumaran-k** · Checked: **2026-10-02**

Repository: [MUTHUKUMARAN-K-1/intern-07-muthukumaran-k](https://github.com/MUTHUKUMARAN-K-1/intern-07-muthukumaran-k/tree/intern/07-muthukumaran-k).

This branch extends the reference implementation inherited at `f4e9167`.
The baseline already implemented medicine management, OCR, refills, adherence and
role dashboards. Those features were reviewed and re-tested; they are not claimed
as newly authored work. This submission closes the account UI, browser push,
retry, shared-cache and deployment configuration gaps.

## Specification coverage

| Milestone | Working implementation | Evidence |
|---|---|---|
| 1 | Requirements, database design, wireframes, JWT and session authentication, verified Google token exchange with browser sign-in, password change and reset, three roles, profiles and caregiver consent | `docs/database/`, `docs/wireframes/`, `backend/apps/accounts/`, `backend/apps/profiles/`, `frontend/src/features/auth/`, `PasswordResetPage.jsx` |
| 2 | Medicine and disease grouping, family profiles, recurring dosage schedules, Taken/Missed/Snooze/Skip, history, notification preferences, push registration, email/SMS dispatch, persistent bounded retries | `backend/apps/medications/`, `backend/apps/reminders/`, `backend/apps/notifications/`, `frontend/src/features/notifications/` |
| 3 | Tesseract extraction and catalogue matching, user review before saving, quantities and frequency, consumption-based forecasts, refill/low-stock alerts including caregivers, weekly/monthly adherence and CSV | `backend/apps/ocr/`, `backend/apps/refills/`, `backend/apps/adherence/`, `ml/`, API end-to-end integration test |
| 4 | Patient/caregiver/admin analytics, adherence and refill charts, automated API/component/browser tests, production images, durable data and job storage, Render blueprints, deployment and demo documentation | `frontend/e2e/`, `docker-compose.prod.yml`, `render.yaml`, `docs/deployment.md`, `docs/demo/` |

**The core application is deployed on free Render hosting with Neon PostgreSQL.**
All 20 hosted deployment smoke checks passed through the frontend URL. External
scheduling and real Google/email/push/SMS acceptance remain pending; see
[live deployment verification](live-deployment.md).

## Changes in this branch

- Google sign-in appears on login and registration when its public client ID is set.
- Password reset has request and confirmation pages, validation and error states.
- Browser push uses a locally bundled Firebase service worker. Registration is an
  explicit user action; foreground notices work across authenticated pages.
  Device removal and logout revoke the user's device registration.
- Dose reminders use each enabled push/email/SMS channel. Failed deliveries retry
  the same history row, with 1- and 2-minute backoff and three total attempts.
  Abandoned queued rows are recovered after five minutes. Row locks prevent two
  workers from simultaneously delivering the same row. Provider acceptance after
  an ambiguous timeout can still produce a duplicate: delivery is at least once.
- Production missing-provider attempts fail visibly instead of simulating success.
  The UI describes provider acceptance, not an unverified inbox/device receipt.
- Production rate limits use shared Redis. Readiness checks both PostgreSQL and
  cache connectivity; liveness remains independent of the rate limiter.
- The full Compose topology persists Redis queues with AOF and no eviction. The
  free Render deployment instead uses an ephemeral cache and external scheduling.
  nginx preserves the trusted TLS proxy's scheme; Render has corresponding
  routing and cache/security headers.
- Docker builds use the committed npm lockfile and include provider SDKs. Render
  selects this branch, shares environment settings, and keeps OCR on the API where
  the uploaded image resides. Mobile users have a scrollable navigation bar.
- CI discovery stops `find` after its first match, preventing a broken pipe under
  `pipefail` from silently skipping backend tests on a populated repository.
- Celery beat has a dedicated scheduler-initialization probe, so Compose's
  `--wait` can check every production service without an inapplicable HTTP probe.
- The demo determinism assertion compares doses by stable patient/medicine/time
  identities with a pinned clock, avoiding PostgreSQL's unspecified ordering of
  rows sharing a dose time while checking their quantities and response times.
- Internal readiness probes send a configured allowed Host header. CI excludes
  the loopback IP from the allowlist to verify this public-domain configuration.

## Verification performed here

| Check | Result |
|---|---|
| Backend pytest, including real Tesseract tests | **648 passed**, 91% combined line/branch coverage of `apps` (rounded) |
| Frontend Vitest | **148 passed** |
| ML/parser/refill evaluation tests | **31 passed** |
| Chromium browser workflows against a running Django API | **4 passed** |
| Django system checks / migration consistency | Clean / no missing migrations |
| Ruff, Black, isort, ESLint, Prettier, production SPA and service-worker build | Passed |
| Hosted Render/Neon deployment smoke checks | **20 / 20 passed** |
| Frontend dependency audit | **0 vulnerabilities** after gRPC/brace-expansion patches |

Total: **831 passing automated tests**. Local backend/browser checks used SQLite;
the existing CI workflow runs PostgreSQL tests, Docker builds and the 20-check
production-stack smoke test. Docker was unavailable in this workspace, so that
stack was verified by [the successful branch CI run](https://github.com/MUTHUKUMARAN-K-1/intern-07-muthukumaran-k/actions/runs/37033931264).
The matching browser workflow also passed. Historical
performance results from the reference implementation are linked in
[`performance.md`](performance.md); they were not re-measured in this run.

## Release acceptance

Follow [`docs/deployment.md`](../deployment.md), using this fork and branch.
Set platform secrets, the real domains and provider configuration; validate the
blueprint or Compose configuration; run migrations and the staging smoke test;
verify Google sign-in, a reset email and actual push/email/SMS delivery. Keep one
beat scheduler, back up PostgreSQL and prescription media, and test a restore.

The free blueprint is a demo option: ephemeral media and sleeping instances are
not suitable for dependable patient reminders. Real OCR photographs, handwriting,
external provider failures and physical mobile-device behavior need field testing.
