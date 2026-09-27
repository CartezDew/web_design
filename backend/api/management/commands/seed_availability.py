from datetime import time
from django.core.management.base import BaseCommand
from scheduling.models import AvailabilityRule


class Command(BaseCommand):
    help = "Create the default consultation schedule without removing existing rules."

    def handle(self, *args, **options):
        for weekday in range(7):
            weekend = weekday >= 5
            _, created = AvailabilityRule.objects.get_or_create(
                weekday=weekday,
                start_time=time(11, 0) if weekend else time(10, 30),
                end_time=time(18, 0) if weekend else time(20, 0),
                defaults={"slot_minutes": 30, "is_active": True},
            )
            if created:
                self.stdout.write(f"Created rule for weekday {weekday}.")
