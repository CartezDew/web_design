import uuid
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from communications.models import EmailDelivery
from api.notifications import deliver_email


class Command(BaseCommand):
    help = "Retry unsent notification emails from the durable outbox."

    def add_arguments(self, parser):
        parser.add_argument("--exclude", type=uuid.UUID, action="append", default=[],
                            help="Leave a specific delivery queued without sending it; may be repeated.")

    def handle(self, *args, **options):
        if settings.DJANGO_ENV == "production" and settings.EMAIL_PROVIDER == "console":
            raise CommandError("Production email requires a configured provider; no messages attempted.")
        if settings.EMAIL_PROVIDER == "microsoft365":
            from communications.microsoft_email import access_token
            access_token()  # Fail before consuming outbox attempts if authorization needs attention.
        from scheduling.services import expire_pending_appointments
        expire_pending_appointments()
        ids = list(EmailDelivery.objects.filter(sent_at__isnull=True, attempts__lt=10)
                   .exclude(pk__in=options["exclude"])
                   .values_list("pk", flat=True)[:100])
        for pk in ids:
            deliver_email(pk)
        self.stdout.write(f"Processed {len(ids)} queued messages.")
        from api.analytics_preferences import report_preference_totals
        try:
            report_preference_totals()
        except Exception:
            # Optional aggregate reporting must never interfere with email delivery.
            self.stderr.write("Anonymous analytics summary reporting was unavailable.")
