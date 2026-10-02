"""Delivery survives temporary failures without creating duplicate history rows."""

from datetime import time, timedelta
from unittest.mock import Mock

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.choices import NotificationCategory, NotificationChannel, NotificationStatus
from apps.medications.models import MedicationSchedule, Medicine
from apps.notifications.models import DeviceToken, NotificationLog
from apps.notifications.providers.base import DeliveryResult
from apps.notifications.providers.channels import provider_for
from apps.notifications.services import dispatcher
from apps.notifications.tasks import retry_failed_deliveries
from apps.reminders.models import DoseEvent

pytestmark = pytest.mark.django_db


def send(patient):
    return dispatcher.send(
        recipient=patient,
        category=NotificationCategory.DOSE_REMINDER,
        channels=(NotificationChannel.EMAIL,),
        subject="Medicine due",
        body="Check your schedule.",
    )[0]


def make_due(log):
    log.next_attempt_at = timezone.now() - timedelta(seconds=1)
    log.save(update_fields=["next_attempt_at"])


def test_temporary_failure_retries_the_same_row_once_and_clears_error(patient, monkeypatch):
    provider = Mock()
    provider.send.side_effect = [DeliveryResult.failed("timeout"), DeliveryResult.sent("mail-1")]
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    log = send(patient)
    assert log.status == NotificationStatus.FAILED
    assert log.attempts == 1
    assert retry_failed_deliveries() == 0  # respect the backoff
    make_due(log)
    assert retry_failed_deliveries() == 1
    assert retry_failed_deliveries() == 0
    log.refresh_from_db()
    assert (log.status, log.attempts, log.error, log.next_attempt_at) == ("SENT", 2, "", None)
    assert NotificationLog.objects.count() == 1
    assert provider.send.call_count == 2


def test_retry_stops_after_three_attempts(patient, monkeypatch):
    provider = Mock()
    provider.send.return_value = DeliveryResult.failed("temporarily unavailable")
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    log = send(patient)
    for _ in range(2):
        make_due(log)
        retry_failed_deliveries()
        log.refresh_from_db()
    assert log.attempts == 3
    assert log.next_attempt_at is None
    assert retry_failed_deliveries() == 0
    assert provider.send.call_count == 3


def test_retry_respects_a_new_opt_out(patient, monkeypatch):
    provider = Mock()
    provider.send.return_value = DeliveryResult.failed("timeout")
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    log = send(patient)
    prefs = dispatcher.preferences_for(patient)
    prefs.email_enabled = False
    prefs.save()
    make_due(log)
    assert retry_failed_deliveries() == 0
    log.refresh_from_db()
    assert log.status == NotificationStatus.SKIPPED
    assert provider.send.call_count == 1


def test_abandoned_queued_notification_is_recovered(patient, monkeypatch):
    provider = Mock()
    provider.send.return_value = DeliveryResult.sent("mail-1")
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    log = NotificationLog.objects.create(
        recipient=patient, category="DOSE_REMINDER", channel="EMAIL", subject="Due", body="Due"
    )
    NotificationLog.objects.filter(pk=log.pk).update(
        created_at=timezone.now() - timedelta(minutes=6)
    )
    assert retry_failed_deliveries() == 1
    assert retry_failed_deliveries() == 0
    assert provider.send.call_count == 1


@pytest.mark.parametrize("channel", ["PUSH", "EMAIL", "SMS"])
def test_production_does_not_report_missing_credentials_as_delivery(settings, channel):
    settings.NOTIFICATION_ALLOW_CONSOLE = False
    settings.FIREBASE_CREDENTIALS_PATH = ""
    settings.TWILIO_ACCOUNT_SID = ""
    settings.EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    assert provider_for(channel).name == "unconfigured"


def test_unexpected_provider_error_is_logged_and_retryable(patient, monkeypatch):
    provider = Mock()
    provider.send.side_effect = RuntimeError("provider bug")
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    log = send(patient)
    assert log.status == NotificationStatus.FAILED
    assert log.next_attempt_at


def test_due_reminders_reach_each_enabled_channel(patient, monkeypatch):
    medicine = Medicine.objects.create(patient=patient.patient_profile, name="Metformin")
    schedule = MedicationSchedule.objects.create(
        medicine=medicine, slot="MORNING", time_of_day=time(8)
    )
    dose = DoseEvent.objects.create(
        schedule=schedule,
        medicine=medicine,
        patient=medicine.patient,
        scheduled_for=timezone.now(),
        quantity_expected=1,
    )
    provider = Mock()
    provider.send.return_value = DeliveryResult.sent("local-test-provider")
    monkeypatch.setattr(dispatcher, "provider_for", lambda _channel: provider)
    prefs = dispatcher.preferences_for(patient)
    prefs.sms_enabled = True
    prefs.save()
    logs = dispatcher.notify_dose_due(dose)
    assert {log.channel for log in logs} == {"EMAIL", "SMS", "PUSH"}
    assert all(log.status == NotificationStatus.SENT for log in logs)


def test_logout_revokes_only_the_users_own_push_registration(patient_client, patient, caregiver):
    owned = DeviceToken.objects.create(user=patient, token="local-test-token")
    other = DeviceToken.objects.create(user=caregiver, token="other-test-token")
    url = reverse("v1:auth:logout")
    for device in (other, owned):
        response = patient_client.post(
            url, {"refresh": str(RefreshToken.for_user(patient)), "device_id": str(device.pk)}
        )
        assert response.status_code == 205
    owned.refresh_from_db()
    other.refresh_from_db()
    assert not owned.is_active
    assert other.is_active
