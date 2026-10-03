from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError
from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule, BookingLock

EASTERN = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")


class BookingConflict(APIException):
    status_code = 409
    default_detail = "That time is no longer available. Please choose another time."


def available_starts(for_date, exclude_id=None):
    now = timezone.now()
    today = now.astimezone(EASTERN).date()
    if not today <= for_date <= today + timedelta(days=60):
        return []
    overrides = list(AvailabilityOverride.objects.filter(date=for_date))
    if any(item.is_blocked for item in overrides):
        return []
    periods = [(item.start_time, item.end_time, 30) for item in overrides
               if item.start_time and item.end_time and not item.is_blocked]
    if not periods:
        periods = [(r.start_time, r.end_time, r.slot_minutes) for r in
                   AvailabilityRule.objects.filter(weekday=for_date.weekday(), is_active=True)]
    day_start = datetime.combine(for_date, datetime.min.time(), EASTERN)
    day_end = datetime.combine(for_date + timedelta(days=1), datetime.min.time(), EASTERN)
    booked = Appointment.objects.filter(starts_at__lt=day_end, ends_at__gt=day_start,
        status__in=["pending", "confirmed"], deleted_at__isnull=True)
    if exclude_id:
        booked = booked.exclude(pk=exclude_id)
    intervals = list(booked.values_list("starts_at", "ends_at"))
    slots = set()
    for start, end, step in periods:
        cursor = datetime.combine(for_date, start, EASTERN)
        end_time = datetime.combine(for_date, end, EASTERN)
        while cursor + timedelta(minutes=30) <= end_time:
            utc = cursor.astimezone(UTC)
            # Reject nonexistent local times during the spring clock change.
            valid_local = utc.astimezone(EASTERN).replace(tzinfo=None) == cursor.replace(tzinfo=None)
            if valid_local and utc > now and not any(a < utc + timedelta(minutes=30) and b > utc for a, b in intervals):
                slots.add(utc)
            cursor += timedelta(minutes=max(int(step), 30))
    return sorted(slots)


@transaction.atomic
def save_appointment(data, instance=None):
    # One consultant: serialize calendar mutations before checking overlapping intervals.
    BookingLock.objects.get_or_create(pk=1)
    BookingLock.objects.select_for_update().get(pk=1)
    if instance:
        instance = Appointment.objects.select_for_update().get(pk=instance.pk)
    elif data.get("idempotency_key"):
        existing = Appointment.objects.filter(idempotency_key=data["idempotency_key"]).first()
        if existing:
            return existing
    start = data.get("starts_at", getattr(instance, "starts_at", None))
    state = data.get("status", getattr(instance, "status", "pending"))
    if start is None or timezone.is_naive(start):
        raise ValidationError({"starts_at": "Choose an available date and time."})
    needs_slot = state in ["pending", "confirmed"] and (instance is None or
        start != instance.starts_at or instance.status not in ["pending", "confirmed"])
    if needs_slot and start not in available_starts(start.astimezone(EASTERN).date(), getattr(instance, "pk", None)):
        raise BookingConflict()
    data["ends_at"] = start + timedelta(minutes=30)
    if instance:
        for key, value in data.items():
            setattr(instance, key, value)
        instance.save()
    else:
        instance = Appointment.objects.create(**data)
    notify_appointment(instance)
    return instance


def calendar_text(appointment):
    status = {"pending": "TENTATIVE", "confirmed": "CONFIRMED", "cancelled": "CANCELLED", "completed": "CONFIRMED"}[appointment.status]
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cartez Dewberry//Consultations//EN",
             "CALSCALE:GREGORIAN", "BEGIN:VEVENT", f"UID:{appointment.pk}@marcdbycartez.com",
             f"DTSTAMP:{timezone.now().astimezone(UTC):%Y%m%dT%H%M%SZ}",
             f"LAST-MODIFIED:{appointment.updated_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
             f"DTSTART:{appointment.starts_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
             f"DTEND:{appointment.ends_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
             "SUMMARY:Consultation with Cartez Dewberry", f"STATUS:{status}",
             "DESCRIPTION:Scheduled in Eastern time (EST/EDT).\\n",
             f" {appointment.starts_at.astimezone(EASTERN):%B %d at %I:%M %p %Z}.\\n",
             " Cartez will email the details.",
             "END:VEVENT", "END:VCALENDAR", ""]
    return "\r\n".join(lines)


def notify_appointment(appointment):
    from api.tokens import issue_token
    from api.notifications import queue_email
    token = issue_token("appointment", appointment.pk)
    link = f"{settings.FRONTEND_URL}/book/manage?id={appointment.pk}&token={token}"
    when = appointment.starts_at.astimezone(EASTERN).strftime("%A, %B %d at %I:%M %p %Z")
    text = f"Your consultation is {appointment.get_status_display().lower()}: {when}.\n"
    if appointment.status == "pending":
        text += "Your requested time is reserved while Cartez confirms the call.\n"
    text += "All appointments are scheduled in Eastern time (EST/EDT).\n"
    text += f"View, reschedule, cancel, or download your calendar entry: {link}"
    queue_email("Your consultation with Cartez", text, [appointment.email], calendar_text(appointment))
    queue_email("Consultation update", f"A consultation is {appointment.status} for {when}. Review: {settings.FRONTEND_URL}/dashboard/appointments", [settings.ADMIN_NOTIFICATION_EMAIL])
