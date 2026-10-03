import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction

logger = logging.getLogger(__name__)


def queue_email(subject, body, recipients, attachment=None, *, html=None):
    """Commit an outbox record with business data; delivery can be retried safely."""
    from communications.models import EmailDelivery
    from communications.email_design import branded_email
    delivery = EmailDelivery.objects.create(subject=subject, body=body, recipients=recipients,
                                            calendar=attachment or "",
                                            html_body=html if html is not None else branded_email(subject, paragraphs=body.split("\n\n")))
    transaction.on_commit(lambda: deliver_email(delivery.pk))


def deliver_email(pk):
    from communications.models import EmailDelivery
    from django.utils import timezone
    with transaction.atomic():
        delivery = EmailDelivery.objects.select_for_update().get(pk=pk)
        if delivery.sent_at:
            return
        if settings.DJANGO_ENV == "production" and settings.EMAIL_PROVIDER == "console":
            delivery.last_error = "EmailProviderNotConfigured"
            delivery.save(update_fields=["last_error"])
            return
        message = EmailMultiAlternatives(delivery.subject, delivery.body, settings.DEFAULT_FROM_EMAIL,
                                        delivery.recipients, reply_to=[settings.DEFAULT_FROM_EMAIL])
        if delivery.html_body:
            message.attach_alternative(delivery.html_body, "text/html")
        if delivery.calendar:
            message.attach("consultation.ics", delivery.calendar, "text/calendar")
        delivery.attempts += 1
        try:
            if message.send(fail_silently=False) != 1:
                raise RuntimeError("Email provider did not accept the message.")
            delivery.sent_at = timezone.now()
            delivery.last_error = ""
        except Exception as error:
            # Do not log provider responses: they can contain contact details or credentials.
            delivery.last_error = type(error).__name__
            logger.error("Email delivery failed; retry outbox record %s (%s)", pk, delivery.last_error)
        delivery.save(update_fields=["attempts", "sent_at", "last_error"])
