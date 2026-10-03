import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from audit.models import SoftDeleteModel, TimeStampedModel


class AvailabilityRule(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    weekday = models.PositiveSmallIntegerField(help_text="Monday=0, Sunday=6")
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        constraints = [
            models.CheckConstraint(condition=Q(weekday__gte=0, weekday__lte=6), name="valid_weekday"),
            models.CheckConstraint(condition=Q(end_time__gt=models.F("start_time")), name="availability_end_after_start"),
        ]


class AvailabilityOverride(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(db_index=True)
    is_blocked = models.BooleanField(default=False)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["date", "start_time"]


class Appointment(SoftDeleteModel, TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        EXPIRED = "expired", "Unconfirmed · time released"

    acquisition = models.JSONField(default=dict, blank=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="appointments"
    )
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="appointments"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    email_verified_at = models.DateTimeField(null=True, blank=True)
    confirmation_nonce = models.UUIDField(default=uuid.uuid4, editable=False)
    confirmation_expires_at = models.DateTimeField(null=True, blank=True)
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["starts_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["starts_at"],
                condition=Q(status__in=["pending", "confirmed"], deleted_at__isnull=True),
                name="one_active_appointment_per_start",
            ),
            models.CheckConstraint(condition=Q(ends_at__gt=models.F("starts_at")), name="appointment_end_after_start"),
        ]


class BookingLock(models.Model):
    """Singleton row used to serialize bookings for the one-consultant calendar."""
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
