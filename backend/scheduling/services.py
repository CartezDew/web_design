from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.db import transaction
from django.db.models import Q
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
        status__in=["pending", "confirmed"], deleted_at__isnull=True).exclude(
        Q(status="pending", confirmation_expires_at__lte=now))
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
def expire_pending_appointments():
    BookingLock.objects.get_or_create(pk=1)
    BookingLock.objects.select_for_update().get(pk=1)
    records = Appointment.objects.select_for_update().filter(status="pending", deleted_at__isnull=True,
                                                             confirmation_expires_at__lte=timezone.now())
    count = 0
    for record in records:
        record.status = Appointment.Status.EXPIRED
        record.save(update_fields=["status", "updated_at"])
        from audit.models import AuditEvent
        AuditEvent.objects.create(action="appointment.confirmation_expired", object_type="Appointment", object_id=str(record.pk))
        count += 1
    return count


@transaction.atomic
def save_appointment(data, instance=None):
    # One consultant: serialize calendar mutations before checking overlapping intervals.
    BookingLock.objects.get_or_create(pk=1)
    BookingLock.objects.select_for_update().get(pk=1)
    expire_pending_appointments()
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
    needs_confirmation = state == "pending" and (instance is None or start != instance.starts_at or
        data.get("email", instance.email) != instance.email or instance.status != "pending" or
        instance.confirmation_expires_at is None)
    if needs_confirmation:
        import uuid
        data.update(email_verified_at=None, confirmation_nonce=uuid.uuid4(),
                    confirmation_expires_at=min(timezone.now() + timedelta(hours=1), start))
    if state in ["confirmed", "completed"] and (instance is None or not instance.email_verified_at):
        raise ValidationError("The customer must confirm their email before this consultation is booked.")
    if instance and state in ["confirmed", "completed"] and (
        start != instance.starts_at or data.get("email", instance.email) != instance.email):
        raise ValidationError("Request the new time as pending so the customer can confirm it by email.")
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
    status = {"pending": "TENTATIVE", "confirmed": "CONFIRMED", "cancelled": "CANCELLED", "expired": "CANCELLED", "completed": "CONFIRMED"}[appointment.status]
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
    from communications.email_design import branded_email
    pending = appointment.status == "pending"
    greeting = f"Hi {appointment.first_name},"
    status_label = appointment.get_status_display()
    details = [("When", when), ("Duration", "30 minutes · Eastern time (EST/EDT)")]
    action = secondary = None
    note = ""
    if pending:
        from api.confirmations import confirmation_link
        deadline = appointment.confirmation_expires_at.astimezone(EASTERN).strftime("%B %d at %I:%M %p %Z")
        heading = "Let’s confirm your call."
        copy = "Your request is received. Confirm your email to book this time."
        action = ("Confirm appointment", confirmation_link('appointment', appointment))
        secondary = ("Manage your request", link)
        note = f"Confirm by {deadline}. Your time is held for up to one hour."
    elif appointment.status == "confirmed":
        heading = "You’re booked. Let’s talk."
        copy = "Your appointment is booked. I’ll email how to join before our call."
        action = ("Manage your consultation", link)
        note = "Your calendar entry is attached. You can reschedule or cancel using the button above."
    elif appointment.status == "cancelled":
        heading = "Your call is cancelled."
        copy = "Your consultation has been cancelled and the time has been released. You’re welcome to choose a new time."
        action = ("Choose a new time", f"{settings.FRONTEND_URL}/#book")
        note = "A cancellation calendar entry is attached."
    elif appointment.status == "completed":
        heading = "Thanks for the conversation."
        copy = "Your consultation is complete. Reply here if you have any follow-up questions."
        action = ("Visit the website", settings.FRONTEND_URL + "/")
    else:
        heading = "Your consultation update."
        copy = f"Your consultation is {status_label.lower()}."
        action = ("View your request", link)
    text = f"{greeting}\n\nYour 30-minute consultation is {status_label.lower()}: {when}.\n{copy}\n"
    if pending:
        text += f"Open this link, then press Confirm appointment:\n{action[1]}\n{note}\n"
        text += f"Manage your request: {link}\n"
    else:
        text += f"{action[0]}: {action[1]}\n{note}\n"
    text += "All appointments use Eastern time (EST/EDT).\n\nQuestions? Reply to this email."
    if pending:
        text += " If you didn’t request this, no action is needed."
    text += "\n\nCartez Dewberry\nmarcdbycartez.com"
    queue_email("Confirm your consultation with Cartez" if pending else "Your consultation with Cartez",
                text, [appointment.email], calendar_text(appointment) if not pending else None,
                html=branded_email(heading, preheader=f"{status_label}: {when}. 30 minutes with Cartez.",
                    greeting=greeting, paragraphs=[copy], details=details, action=action, secondary=secondary,
                    note=note, safety="If you didn’t request this, no action is needed." if pending else ""))
    owner_details = [("Name", f"{appointment.first_name} {appointment.last_name}"), ("Email", appointment.email),
                     ("Requested time", when), ("Duration", "30 minutes · Eastern time (EST/EDT)"),
                     ("Status", status_label), ("Email confirmed", "Yes" if appointment.email_verified_at else "No"),
                     ("Notes", appointment.notes or "None")]
    owner_copy = "You can reach out directly while awaiting confirmation." if pending else "The consultation record has been updated."
    queue_email("Consultation request — awaiting customer confirmation" if pending else "Consultation update",
                "\n".join(f"{label}: {value}" for label, value in owner_details) +
                f"\n{owner_copy}\nReview: {settings.FRONTEND_URL}/dashboard/appointments",
                [settings.ADMIN_NOTIFICATION_EMAIL],
                html=branded_email("New consultation request." if pending else "Consultation update.",
                    paragraphs=[owner_copy], details=owner_details,
                    action=("Review appointment", f"{settings.FRONTEND_URL}/dashboard/appointments")))
