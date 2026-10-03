from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from communications.models import EmailDelivery
from api.notifications import deliver_email


class Command(BaseCommand):
    help = "Retry unsent notification emails from the durable outbox."

    def handle(self, *args, **options):
        if settings.DJANGO_ENV == "production" and settings.EMAIL_PROVIDER == "console":
            raise CommandError("Production email requires a configured provider; no messages attempted.")
        if settings.EMAIL_PROVIDER == "microsoft365":
            from communications.microsoft_email import access_token
            access_token()  # Fail before consuming outbox attempts if authorization needs attention.
        ids = list(EmailDelivery.objects.filter(sent_at__isnull=True, attempts__lt=10)
                   .values_list("pk", flat=True)[:100])
        for pk in ids:
            deliver_email(pk)
        self.stdout.write(f"Processed {len(ids)} queued messages.")
