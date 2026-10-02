"""Retry failed notifications from the persistent delivery log."""

import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

from apps.common.choices import NotificationStatus
from apps.notifications.models import NotificationLog
from apps.notifications.services.dispatcher import deliver

logger = logging.getLogger(__name__)


@shared_task(name="notifications.retry_failed_deliveries")
def retry_failed_deliveries(limit: int = 100) -> int:
    ids = list(
        NotificationLog.objects.filter(
            Q(status=NotificationStatus.FAILED, next_attempt_at__lte=timezone.now())
            | Q(
                status=NotificationStatus.QUEUED,
                created_at__lte=timezone.now() - timedelta(minutes=5),
            )
        )
        .order_by("next_attempt_at")
        .values_list("pk", flat=True)[:limit]
    )
    sent = 0
    for pk in ids:
        try:
            sent += deliver(pk)
        except Exception:  # noqa: BLE001 - one bad row must not block the rest
            logger.exception("Notification retry failed for log %s", pk)
    return sent
