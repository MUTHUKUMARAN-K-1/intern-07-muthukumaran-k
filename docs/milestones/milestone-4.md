# Milestone 4 — Analytics, Testing and Deployment Readiness

- **Intern:** Muthukumaran K
- **Branch:** `intern/07-muthukumaran-k`
- **Updated on:** 2026-10-02

This branch builds on the reference implementation at `f4e9167`. Its complete
feature matrix and changes are in the [branch readiness report](../reports/branch-readiness.md).

## Evaluation criteria

| Criterion | Status | Evidence |
|---|---|---|
| Frontend and backend deployment | Core app live on free Render/Neon; 20/20 hosted smoke checks pass | [Live deployment verification](../reports/live-deployment.md), production Dockerfiles, Compose and branch-pinned Render blueprints |
| Analytics dashboards | Implemented and tested | Patient, caregiver and administrator dashboards; API role tests and browser workflows |
| Refill and adherence visualisations | Implemented and tested | Accessible SVG stock projections, adherence rings, daily histories and breakdowns |
| Testing and validation | 831 automated tests passed here | 648 backend, 148 frontend, 31 ML and 4 Chromium workflows; [testing report](../reports/testing-report.md) |
| Medication workflow demonstration | Automated and documented | Real browser registration, prescription review, dose action, history, refills and adherence; API integration scenario also covers caregiver alerts and access boundaries |
| Production reliability | Implemented and tested where available | Shared Redis rate limits, DB/cache readiness, bounded persistent notification retries, durable Redis queue, trusted HTTPS proxy headers and service-worker build |
| Documentation and presentation | Present and updated | Milestone reports, API schema, database/architecture notes, deployment instructions, [demo script](../demo/demo-script.md) and [presentation outline](../demo/presentation.md) |

## Validation

Django checks are clean, migration consistency passes, and Python/frontend lint
and formatting pass. The SPA and Firebase service worker build successfully.
Backend coverage reports 91% combined statement/branch coverage of `apps`
(rounded). Chromium tests use the real local Django API; they verify caregiver
and administrator role boundaries and a 390 px mobile layout as well as the
patient workflow. External Google and messaging services were not contacted.

Docker was unavailable in this workspace. Existing CI covers PostgreSQL, both
production images and the 20-check full-stack smoke test. The new browser workflow
runs on this branch and retains its HTML report and failure traces. Check the
successful [branch CI run](https://github.com/MUTHUKUMARAN-K-1/intern-07-muthukumaran-k/actions/runs/37033931264)
and the matching browser workflow. All 20 checks also passed against the hosted
Render/Neon application through its public frontend URL.

## Deployment handoff

Use this fork and `intern/07-muthukumaran-k`, rather than `main`. Follow the
[deployment guide](../deployment.md). Configure real domains, PostgreSQL/Redis,
Google's public client ID, a verified SMTP/SendGrid sender, Firebase service-account
files and web VAPID configuration, and Twilio credentials if SMS is enabled.
Rebuild the frontend when public authentication/push values change. On Render,
keep image OCR synchronous because only the API has the prescription-media disk.

**Live URL:** <https://pillsync-mk-web.onrender.com/login>.
External scheduler activation, a platform administrator login and real Google,
reset-email and push/email/SMS acceptance remain pending. The free blueprint is
a demonstration option with sleeping instances and ephemeral prescription photos.

## Performance and limitations

The inherited [performance report](../reports/performance.md) documents its own
load-test topology and simulation assumptions. Those results were not re-measured
in this fork. Synthetic OCR and refill evaluations are regression evidence, not
clinical or field accuracy claims. Provider acceptance is not proof of an inbox
or device receipt; ambiguous provider timeouts can duplicate an at-least-once
retry. Physical-device, cross-browser and accessibility audits remain advisable.

The demo screenshots and presentation outline inherited from the reference build
remain useful walkthrough material. No deployment video or live-host screenshot
was fabricated.
