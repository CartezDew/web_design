from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule

EASTERN = ZoneInfo("America/New_York")


def available_starts(for_date):
    overrides = list(AvailabilityOverride.objects.filter(date=for_date))
    if any(item.is_blocked for item in overrides):
        return []

    periods = [
        (item.start_time, item.end_time, 30)
        for item in overrides
        if not item.is_blocked and item.start_time and item.end_time
    ]
    if not periods:
        periods = [
            (rule.start_time, rule.end_time, rule.slot_minutes)
            for rule in AvailabilityRule.objects.filter(weekday=for_date.weekday(), is_active=True)
        ]

    now = timezone.now()
    booked = set(
        Appointment.objects.filter(
            starts_at__date=for_date,
            status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
            deleted_at__isnull=True,
        ).values_list("starts_at", flat=True)
    )
    slots = []
    for start_time, end_time, minutes in periods:
        cursor = datetime.combine(for_date, start_time, EASTERN)
        period_end = datetime.combine(for_date, end_time, EASTERN)
        while cursor + timedelta(minutes=30) <= period_end:
            utc_start = cursor.astimezone(ZoneInfo("UTC"))
            if utc_start > now and utc_start not in booked:
                slots.append(utc_start)
            cursor += timedelta(minutes=minutes)
    return sorted(set(slots))
