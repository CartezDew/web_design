import logging
from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction

logger = logging.getLogger(__name__)


def queue_email(subject, body, recipients, attachment=None):
    """Commit an outbox record with business data; delivery can be retried safely."""
    from communications.models import EmailDelivery
    delivery = EmailDelivery.objects.create(subject=subject, body=body, recipients=recipients,
                                            calendar=attachment or "")
    transaction.on_commit(lambda: deliver_email(delivery.pk))


def deliver_email(pk):
    from communications.models import EmailDelivery
    from django.utils import timezone
    with transaction.atomic():
        delivery = EmailDelivery.objects.select_for_update().get(pk=pk)
        if delivery.sent_at:
            return
        message = EmailMessage(delivery.subject, delivery.body, settings.DEFAULT_FROM_EMAIL,
                               delivery.recipients)
        if delivery.calendar:
            message.attach("consultation.ics", delivery.calendar, "text/calendar")
        delivery.attempts += 1
        try:
            message.send(fail_silently=False)
            delivery.sent_at = timezone.now()
            delivery.last_error = ""
        except Exception as error:
            # Do not log provider responses: they can contain contact details or credentials.
            delivery.last_error = type(error).__name__
            logger.error("Email delivery failed; retry outbox record %s (%s)", pk, delivery.last_error)
        delivery.save(update_fields=["attempts", "sent_at", "last_error"])
