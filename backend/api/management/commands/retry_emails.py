from django.core.management.base import BaseCommand
from communications.models import EmailDelivery
from api.notifications import deliver_email


class Command(BaseCommand):
    help = "Retry unsent notification emails from the durable outbox."

    def handle(self, *args, **options):
        ids = list(EmailDelivery.objects.filter(sent_at__isnull=True, attempts__lt=10)
                   .values_list("pk", flat=True)[:100])
        for pk in ids:
            deliver_email(pk)
        self.stdout.write(f"Processed {len(ids)} queued messages.")
