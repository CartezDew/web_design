"""Email-only confirmation capabilities, separate from upload and booking-management links."""
from datetime import timedelta
from urllib.parse import urlencode
import uuid

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from api.notifications import queue_email
from api.tokens import issue_token, require_token
from audit.models import AuditEvent
from intakes.models import ProjectBrief
from scheduling.models import Appointment, BookingLock
from scheduling.services import EASTERN
from communications.email_design import branded_email


def confirmation_kind(kind, record):
    # A new nonce invalidates every older link after a contact/time change or resend.
    return f"confirm-{kind}.{record.confirmation_nonce}"


def confirmation_link(kind, record):
    token = issue_token(confirmation_kind(kind, record), record.pk)
    # The token stays in the fragment, outside server access logs and referrers.
    return f"{settings.FRONTEND_URL}/confirm?{urlencode({'kind': kind, 'id': record.pk})}#{urlencode({'token': token})}"


def brief_details(brief):
    labels = [("name", "Name"), ("email", "Email"), ("phone", "Phone"),
              ("company", "Business"), ("business_type", "Business category"),
              ("service_interest", "Service interest"), ("content_readiness", "Content readiness"), ("overview", "Project idea"), ("mission", "Audience"),
              ("success", "Success"), ("pages", "Pages"), ("goal", "Goal"),
              ("offerings", "Products/services"), ("features", "Features"),
              ("inspiration_link", "Inspiration URL"), ("domain", "Website/domain"),
              ("launch_date", "Target launch"), ("brand", "Brand direction"),
              ("integrations", "Integrations"), ("package", "Starting package"),
              ("referral", "Referral"), ("social_urls", "Social URLs"), ("notes", "Notes")]
    return [(label, str(getattr(brief, field))) for field, label in labels if getattr(brief, field, "")]


def brief_summary(brief):
    return "\n\n".join(f"{label}: {value}" for label, value in brief_details(brief))


def send_brief_confirmation(brief):
    link = confirmation_link('brief', brief)
    greeting = f"Hi {brief.name},"
    copy = "Thanks for sharing your idea. Your brief is saved, and I’ll review it personally. Please confirm your email to take the next step."
    note = "This link works for 48 hours. No project or payment commitment—we’ll agree on the details together."
    queue_email("Your project brief is received — confirm your email",
                f"{greeting}\n\n{copy}\n\nOpen this link, then press Confirm email:\n{link}\n\n{note}\n\n"
                "Questions? Reply to this email. If you didn’t send this, no action is needed.\n\nCartez Dewberry\nmarcdbycartez.com",
                [brief.email], html=branded_email("Your idea is in good hands.",
                    preheader="Your brief is saved. One quick step: confirm your email.", greeting=greeting,
                    paragraphs=[copy], action=("Confirm email", link), note=note,
                    safety="If you didn’t send this request, no action is needed."))


def prepare_brief_confirmation(brief):
    brief.email_verified_at = None
    brief.confirmation_nonce = uuid.uuid4()
    brief.confirmation_expires_at = timezone.now() + timedelta(hours=48)
    brief.save(update_fields=["email_verified_at", "confirmation_nonce", "confirmation_expires_at", "updated_at"])
    send_brief_confirmation(brief)


@method_decorator(csrf_protect, name="dispatch")
class SubmissionConfirmationView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def record(self, request, locked=False):
        values = request.query_params if request.method == "GET" else request.data
        kind = values.get("kind")
        if kind not in ["brief", "appointment"]:
            raise ValidationError("Open the confirmation link from your email.")
        try:
            pk = uuid.UUID(str(values.get("id", "")))
        except (TypeError, ValueError, AttributeError):
            raise ValidationError("Open the confirmation link from your email.")
        if locked and kind == "appointment":
            BookingLock.objects.get_or_create(pk=1)
            BookingLock.objects.select_for_update().get(pk=1)
        model = ProjectBrief if kind == "brief" else Appointment
        records = model.objects.filter(deleted_at__isnull=True)
        record = get_object_or_404(records.select_for_update() if locked else records, pk=pk)
        authorization = request.headers.get("Authorization", "")
        token = authorization.removeprefix("Bearer ") if request.method == "GET" else values.get("token")
        require_token(token, confirmation_kind(kind, record), record.pk, 48 * 3600)
        if not record.confirmation_expires_at or record.confirmation_expires_at <= timezone.now():
            raise ValidationError("This confirmation link has expired. Your request is still saved. "
                                  "Please email Cartez for a new project link, or choose another consultation time.")
        if kind == "appointment" and (record.status not in ["pending", "confirmed"] or record.starts_at <= timezone.now()):
            raise ValidationError("This time can no longer be confirmed. Please choose another time or email Cartez.")
        return kind, record

    def get(self, request):
        kind, record = self.record(request)
        # Reading a link never confirms: email security scanners must not book a call.
        return Response({"kind": kind, "confirmed": bool(record.email_verified_at),
                         "starts_at": record.starts_at if kind == "appointment" else None,
                         "expires_at": record.confirmation_expires_at})

    @transaction.atomic
    def post(self, request):
        kind, record = self.record(request, locked=True)
        if not record.email_verified_at:
            record.email_verified_at = timezone.now()
            fields = ["email_verified_at", "updated_at"]
            if kind == "appointment":
                record.status = Appointment.Status.CONFIRMED
                fields.append("status")
            record.save(update_fields=fields)
            AuditEvent.objects.create(action=f"{kind}.email_confirmed", object_type=type(record).__name__, object_id=str(record.pk))
            if kind == "appointment":
                from scheduling.services import notify_appointment
                notify_appointment(record)
            else:
                queue_email("Project email confirmed",
                            f"{record.name} confirmed {record.email}. The brief is ready for your review.\n"
                            f"{settings.FRONTEND_URL}/dashboard/briefs", [settings.ADMIN_NOTIFICATION_EMAIL],
                            html=branded_email("Project email confirmed.",
                                paragraphs=["This brief is ready for your review."],
                                details=[("Name", record.name), ("Email", record.email)],
                                action=("Review project brief", f"{settings.FRONTEND_URL}/dashboard/briefs")))
        return Response({"kind": kind, "confirmed": True,
                         "detail": "Your consultation is confirmed." if kind == "appointment" else
                         "Your email is confirmed. Cartez will follow up personally."})
