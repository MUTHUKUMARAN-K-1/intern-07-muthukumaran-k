# Hosted PillSync verification

Verified: **2 October 2026** · Branch: **intern/07-muthukumaran-k**

Application code deployed: `af89fc157790d3a5385971fafd72042c39380d3f`.
Later documentation/header updates do not change the application code.

| Resource | Verified configuration |
|---|---|
| Frontend | `pillsync-mk-web`, Render static site; <https://pillsync-mk-web.onrender.com/login> |
| API | `pillsync-mk-api`, Render Free, Singapore, Docker, one worker, synchronous OCR |
| Readiness | <https://pillsync-mk-api.onrender.com/health/ready/>; HTTP 200, `status: ok` |
| Database | Dedicated Neon `pillsync` project, PostgreSQL 16, Singapore, Free |
| Shared cache | Render `pillsync-cache`, Free, Singapore; external traffic blocked |
| Cost setup | No card added; no paid PillSync resource created |

## Live acceptance

```bash
python scripts/smoke_test.py https://pillsync-mk-web.onrender.com
```

Result: **20 of 20 checks passed**, exit code **0**.

The checks verified SPA serving and deep links, uncached root HTML, liveness and
database/cache readiness, anonymous access rejection, the Django admin proxy,
patient registration/login/profile, typed prescription extraction and catalogue
matching, medicine creation, dose schedule records, a PNG through real Tesseract,
refill forecasts, adherence, dashboard data, patient rejection from administrator
analytics and `Server-Timing` response headers. One synthetic patient account was
created and retained by the smoke script; no real patient data was used.

The application's branch CI and browser workflows also passed at `af89fc1`:
[CI](https://github.com/MUTHUKUMARAN-K-1/intern-07-muthukumaran-k/actions/runs/37033931264)
and [browser checks](https://github.com/MUTHUKUMARAN-K-1/intern-07-muthukumaran-k/actions/runs/37033931171).

## Remaining acceptance

- External scheduling is not active. A free cron-job.org account and two POST
  jobs are needed. The API has a generated `CRON_SECRET`; it has not been shared
  with the scheduler. Scheduled dose records passing the test do not prove that
  an external scheduler executes or a notification reaches a person.
- Real Google/Firebase/email/SMS provider configuration and receipt testing remain
  pending. The application does not claim simulated production delivery.
- A platform administrator account has not been provisioned. Public registration
  permits patient/caregiver roles only; admin access boundaries were checked.
- Free Render instances sleep. Prescription photos are ephemeral and cache
  counters reset on a cache restart. PostgreSQL holds durable application data.

No live real-patient, physical-device or clinical acceptance is claimed.
