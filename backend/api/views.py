import hashlib
import json
import uuid
from datetime import date, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import DatabaseError, IntegrityError, connection, models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Invitation, User
from assets.models import Asset
from audit.models import AuditEvent
from communications.models import Conversation, Message
from intakes.models import ProjectBrief
from projects.models import Project, ProjectStatusHistory
from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule
from scheduling.services import available_starts
from api.permissions import IsAdminRole
from api.tokens import issue_token, require_token
from api.throttles import LoginThrottle, PublicFormThrottle
from api.form_protection import issue_form_guard, verify_form_guard
from api.client_address import client_ip
from api.notifications import queue_email
from communications.email_design import branded_email
from scheduling.services import save_appointment, calendar_text
from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from api.serializers import (
    AppointmentSerializer,
    AssetSerializer,
    AvailabilityOverrideSerializer,
    AvailabilityRuleSerializer,
    ConversationSerializer,
    InvitationAcceptSerializer,
    MessageSerializer,
    ProjectBriefSerializer,
    ProjectSerializer,
    ProjectStatusUpdateSerializer,
    PublicAppointmentSerializer,
    PublicBriefCreateSerializer,
    UserSerializer,
)
from api.storage import signed_upload_url, validate_uploaded_blob


def audit(request, action, obj, metadata=None):
    AuditEvent.objects.create(
        actor=request.user if request.user.is_authenticated else None,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=str(obj.pk),
        metadata=metadata or {},
        ip_address=client_ip(request),
    )


def verify_turnstile(token, remote_ip):
    if not settings.TURNSTILE_REQUIRED:
        return True
    if not token or not settings.TURNSTILE_SECRET_KEY:
        return False
    payload = urlencode({
        "secret": settings.TURNSTILE_SECRET_KEY,
        "response": token,
        "remoteip": remote_ip or "",
    }).encode()
    request = Request("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=payload)
    try:
        with urlopen(request, timeout=5) as response:
            return bool(json.load(response).get("success"))
    except Exception:
        return False


@method_decorator(transaction.non_atomic_requests, name="dispatch")
class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except DatabaseError:
            return Response({"status": "unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"status": "ok"})


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.middleware.csrf import get_token
        return Response({"csrfToken": get_token(request), "formGuard": issue_form_guard()})


@method_decorator(csrf_protect, name="dispatch")
class SessionView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def get(self, request):
        return Response({"user": UserSerializer(request.user).data if request.user.is_authenticated else None})

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        user = authenticate(request, email=email, password=password)
        if user is None or not user.is_active:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        request.session.cycle_key()
        audit(request, "auth.login", user)
        return Response({"user": UserSerializer(user).data})

    def delete(self, request):
        if request.user.is_authenticated:
            audit(request, "auth.logout", request.user)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicFormThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            queue_email("Reset your client portal password", f"Reset your password: {url}", [user.email],
                        html=branded_email("Reset your password.",
                            paragraphs=["Use the button below to choose a new password for your client portal."],
                            action=("Reset password", url), safety="If you didn’t request this, no action is needed."))
        return Response({"detail": "If the account exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicFormThrottle]

    def post(self, request):
        try:
            user_id = force_str(urlsafe_base64_decode(request.data.get("uid", "")))
            user = User.objects.get(pk=user_id)
        except (ValueError, TypeError, User.DoesNotExist, DjangoValidationError):
            return Response({"detail": "Invalid or expired reset link."}, status=400)
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=400)
        from django.contrib.auth import password_validation
        try:
            password_validation.validate_password(password, user)
        except DjangoValidationError as error:
            raise ValidationError({"password": error.messages})
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


@method_decorator(csrf_protect, name="dispatch")
class InvitationAcceptView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_hash = hashlib.sha256(serializer.validated_data["token"].encode()).hexdigest()
        invitation = get_object_or_404(Invitation.objects.select_for_update(), token_hash=token_hash)
        if not invitation.is_valid():
            return Response({"detail": "Invitation is invalid or expired."}, status=400)
        user, _ = User.objects.get_or_create(
            email=invitation.email,
            defaults={"is_active": False, "role": User.Role.CLIENT},
        )
        if user.is_active or user.role != User.Role.CLIENT:
            return Response({"detail": "This account is already active. Please sign in or reset your password."}, status=400)
        user.first_name = serializer.validated_data["first_name"]
        user.last_name = serializer.validated_data["last_name"]
        user.is_active = True
        user.email_verified_at = timezone.now()
        user.set_password(serializer.validated_data["password"])
        user.save()
        invitation.project.client = user
        invitation.project.save(update_fields=["client", "updated_at"])
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        Appointment.objects.filter(email__iexact=user.email, client__isnull=True).update(client=user)
        login(request, user)
        audit(request, "invitation.accept", invitation)
        return Response({"user": UserSerializer(user).data})


class ProfileView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        allowed = {"first_name", "last_name", "company", "phone"}
        if set(request.data) - allowed:
            raise ValidationError("Only name, company, and phone can be edited here.")
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit(request, "profile.update", request.user)
        return Response(serializer.data)


class PublicBriefCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicFormThrottle]
    serializer_class = PublicBriefCreateSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        key = request.data.get("idempotency_key")
        existing = ProjectBrief.objects.filter(idempotency_key=key, deleted_at__isnull=True).first() if key else None
        if existing:
            return Response({"id": str(existing.pk), "upload_token": issue_token("upload", existing.pk)})
        verify_form_guard(request)
        if not verify_turnstile(request.data.get("turnstile_token"), client_ip(request)):
            return Response({"detail": "Please complete the security check."}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                from api.analytics import acquisition_context
                brief = serializer.save(acquisition=acquisition_context(request.data.get("analytics")))
        except IntegrityError:
            brief = ProjectBrief.objects.get(idempotency_key=key, deleted_at__isnull=True)
            return Response({"id": str(brief.pk), "upload_token": issue_token("upload", brief.pk)})
        from api.analytics import record_lead
        record_lead(brief, "brief", request.data.get("analytics"))
        audit(request, "brief.create", brief)
        from api.confirmations import prepare_brief_confirmation, brief_summary, brief_details
        prepare_brief_confirmation(brief)
        queue_email("New project brief — awaiting email confirmation",
                    f"The brief is saved; customer email confirmation is pending. You can reach out directly now.\n\n"
                    f"{brief_summary(brief)}\n\nReview the full brief and files (as uploads finish): "
                    f"{settings.FRONTEND_URL}/dashboard/briefs", [settings.ADMIN_NOTIFICATION_EMAIL],
                    html=branded_email("A new idea to review.",
                        preheader=f"New brief from {brief.name}. Email confirmation pending.",
                        paragraphs=["The brief is saved. Customer email confirmation is pending; you can reach out directly now."],
                        details=brief_details(brief),
                        action=("Review brief & files", f"{settings.FRONTEND_URL}/dashboard/briefs"),
                        note="Files appear in the dashboard as uploads finish."))
        return Response({"id": str(brief.pk), "upload_token": issue_token("upload", brief.pk)}, status=201)


class AvailabilityView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            start = date.fromisoformat(request.query_params.get("start", date.today().isoformat()))
            days = min(max(int(request.query_params.get("days", "1")), 1), 60)
        except ValueError:
            return Response({"detail": "Use a valid ISO start date."}, status=400)
        result = []
        for offset in range(days):
            current = start + timedelta(days=offset)
            result.append({
                "date": current.isoformat(),
                "slots": [value.isoformat().replace("+00:00", "Z") for value in available_starts(current)],
            })
        return Response(result)


class PublicAppointmentCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicFormThrottle]
    serializer_class = PublicAppointmentSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        key = request.data.get("idempotency_key")
        existing = Appointment.objects.filter(idempotency_key=key).first() if key else None
        if existing:
            return Response({"id": str(existing.pk), "status": existing.status, "confirmation_email": existing.email, "manage_token": issue_token("appointment", existing.pk)})
        verify_form_guard(request)
        if not verify_turnstile(request.data.get("turnstile_token"), client_ip(request)):
            return Response({"detail": "Please complete the security check."}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("turnstile_token", None)
        from api.analytics import acquisition_context, record_lead
        data["acquisition"] = acquisition_context(request.data.get("analytics"))
        if request.user.is_authenticated:
            data.update(client=request.user, email=request.user.email)
        try:
            with transaction.atomic():
                appointment = save_appointment(data)
        except IntegrityError:
            existing = Appointment.objects.filter(idempotency_key=key).first()
            if existing:
                return Response({"id": str(existing.pk), "status": existing.status, "confirmation_email": existing.email, "manage_token": issue_token("appointment", existing.pk)})
            return Response({"detail": "That time is no longer available."}, status=409)
        record_lead(appointment, "booking", request.data.get("analytics"))
        audit(request, "appointment.create", appointment)
        return Response({"id": str(appointment.pk), "status": appointment.status, "confirmation_email": appointment.email, "manage_token": issue_token("appointment", appointment.pk)}, status=201)


class GuestAppointmentView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def appointment(self, request, pk):
        require_token(request.query_params.get("token") or request.data.get("token"), "appointment", pk, 90 * 86400)
        return get_object_or_404(Appointment, pk=pk, deleted_at__isnull=True)

    def get(self, request, pk):
        appointment = self.appointment(request, pk)
        if request.query_params.get("download") == "calendar":
            if appointment.status != "confirmed":
                raise ValidationError("Confirm your appointment by email before adding it to your calendar.")
            response = HttpResponse(calendar_text(appointment), content_type="text/calendar")
            response["Content-Disposition"] = 'attachment; filename="consultation.ics"'
            response["Cache-Control"] = "private, no-store"
            return response
        return Response({key: value for key, value in AppointmentSerializer(appointment).data.items()
                         if key in ["id", "first_name", "last_name", "starts_at", "ends_at", "status", "email_verified_at", "confirmation_expires_at"]})

    @transaction.atomic
    def post(self, request, pk):
        appointment = self.appointment(request, pk)
        if appointment.starts_at <= timezone.now() or appointment.status in ["cancelled", "completed"]:
            raise ValidationError("This appointment can no longer be changed online. Please contact Cartez.")
        if request.data.get("action") == "cancel":
            data = {"status": "cancelled"}
        elif request.data.get("action") == "reschedule":
            from rest_framework.fields import DateTimeField
            data = {"starts_at": DateTimeField().run_validation(request.data.get("starts_at")), "status": "pending"}
        else:
            raise ValidationError("Choose cancel or reschedule.")
        appointment = save_appointment(data, appointment)
        audit(request, "appointment.guest_update", appointment)
        return Response({"id": str(appointment.pk), "status": appointment.status})


class AdminBriefViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = ProjectBriefSerializer
    queryset = ProjectBrief.objects.filter(deleted_at__isnull=True).prefetch_related("assets")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_update(self, serializer):
        old_email = serializer.instance.email
        brief = serializer.save()
        if brief.email.lower() != old_email.lower():
            from api.confirmations import prepare_brief_confirmation
            prepare_brief_confirmation(brief)
        audit(self.request, "brief.update", brief)

    @action(detail=True, methods=["post"], url_path="resend-confirmation")
    @transaction.atomic
    def resend_confirmation(self, request, pk=None):
        brief = ProjectBrief.objects.select_for_update().get(pk=self.get_object().pk)
        if brief.email_verified_at:
            return Response({"detail": "This email is already confirmed."})
        if brief.confirmation_expires_at and brief.confirmation_expires_at > timezone.now() + timedelta(hours=47):
            raise ValidationError("Please wait one hour between confirmation emails. You can also contact the customer directly.")
        from api.confirmations import prepare_brief_confirmation
        prepare_brief_confirmation(brief)
        audit(request, "brief.confirmation_resent", brief)
        return Response({"detail": "A fresh confirmation email is queued for delivery."})

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])
        audit(self.request, "brief.archive", instance)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def invite(self, request, pk=None):
        brief = ProjectBrief.objects.select_for_update().get(pk=self.get_object().pk)
        if not brief.email_verified_at:
            raise ValidationError("The customer must confirm their email before you accept the brief and create their project.")
        email = brief.email.lower()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "is_active": False,
                "role": User.Role.CLIENT,
                "first_name": brief.name.split(" ")[0],
                "last_name": " ".join(brief.name.split(" ")[1:]),
                "company": brief.company,
                "phone": brief.phone,
            },
        )
        if user.role != User.Role.CLIENT:
            raise ValidationError("Use a client email address for the project invitation.")
        project, project_created = Project.objects.get_or_create(
            brief=brief,
            defaults={
                "client": user,
                "name": request.data.get("project_name") or f"{brief.company or brief.name} website",
                "target_launch_date": brief.launch_date,
            },
        )
        Conversation.objects.get_or_create(
            project=project,
            defaults={"subject": f"{project.name} conversation"},
        )
        if project_created:
            ProjectStatusHistory.objects.create(
                project=project,
                status=project.status,
                note="Project created from the approved intake.",
                changed_by=request.user,
            )
        brief.client = user
        brief.status = ProjectBrief.Status.ACCEPTED
        brief.save(update_fields=["client", "status", "updated_at"])
        if not created and user.is_active:
            queue_email(
                "A project was added to your Marc-D portal",
                f"Sign in to view {project.name}: {settings.FRONTEND_URL}/sign-in",
                [email],
                html=branded_email("Your project is in the portal.",
                    paragraphs=[f"You can now follow {project.name} in your client portal."],
                    action=("View your project", f"{settings.FRONTEND_URL}/sign-in")),
            )
            audit(request, "client.project_link", project)
            return Response({"detail": "Portal access email queued for delivery.", "project": ProjectSerializer(project).data})
        invitation, raw = Invitation.issue(email=email, invited_by=request.user, project=project)
        url = f"{settings.FRONTEND_URL}/accept-invitation?token={raw}"
        queue_email(
            "Your Marc-D client portal invitation",
            f"Set up your client portal within 48 hours: {url}",
            [email],
            html=branded_email("Welcome to your client portal.",
                paragraphs=["Your project has a home. Set up your account to view progress, share files, and keep our conversation in one place."],
                action=("Set up your account", url), note="Your invitation works for 48 hours."),
        )
        audit(request, "client.invite", invitation, {"project_id": str(project.id)})
        return Response({"detail": "Invitation queued for delivery.", "project": ProjectSerializer(project).data})


class AdminProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = ProjectSerializer
    queryset = Project.objects.filter(deleted_at__isnull=True).select_related("client", "brief")

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])
        audit(self.request, "project.archive", instance)

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        project = self.get_object()
        serializer = ProjectStatusUpdateSerializer(project, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit(request, "project.status", project, {"status": project.status})
        queue_email(
            f"{project.name} status update",
            f"Your project is now in {project.get_status_display()}. View details: {settings.FRONTEND_URL}/dashboard",
            [project.client.email],
            html=branded_email("Your project has an update.",
                details=[("Project", project.name), ("Status", project.get_status_display())],
                action=("View project update", f"{settings.FRONTEND_URL}/dashboard")),
        )
        return Response(ProjectSerializer(project).data)


class ClientProjectViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = Project.objects.filter(deleted_at__isnull=True).select_related("client", "brief")
        return queryset if self.request.user.is_admin else queryset.filter(client=self.request.user)


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by("-created_at")


class AvailabilityRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AvailabilityRuleSerializer
    queryset = AvailabilityRule.objects.all()


class AvailabilityOverrideViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AvailabilityOverrideSerializer
    queryset = AvailabilityOverride.objects.all()


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = Appointment.objects.filter(deleted_at__isnull=True)
        return queryset if self.request.user.is_admin else queryset.filter(client=self.request.user)

    def perform_create(self, serializer):
        data = dict(serializer.validated_data)
        requested_client = data.pop("client", None)
        data["client"] = requested_client if self.request.user.is_admin else self.request.user
        if not self.request.user.is_admin:
            data.update(email=self.request.user.email, status="pending")
        data["idempotency_key"] = str(uuid.uuid4())
        serializer.instance = save_appointment(data)
        audit(self.request, "appointment.create", serializer.instance)

    def perform_update(self, serializer):
        data = dict(serializer.validated_data)
        if not self.request.user.is_admin:
            if serializer.instance.starts_at <= timezone.now() or serializer.instance.status in ["cancelled", "completed"]:
                raise ValidationError("This consultation can no longer be changed online. Please contact Cartez.")
            data.pop("client", None)
            data["email"] = self.request.user.email
            if "starts_at" in data and data["starts_at"] != serializer.instance.starts_at:
                data["status"] = "pending"
        serializer.instance = save_appointment(data, serializer.instance)
        audit(self.request, "appointment.update", serializer.instance)

    def perform_destroy(self, instance):
        if not self.request.user.is_admin and (instance.starts_at <= timezone.now() or instance.status in ["cancelled", "completed"]):
            raise ValidationError("This consultation can no longer be changed online. Please contact Cartez.")
        save_appointment({"status": "cancelled"}, instance)
        audit(self.request, "appointment.cancel", instance)

    @action(detail=True, methods=["get"])
    def calendar(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status != "confirmed":
            raise ValidationError("The customer must confirm this appointment before adding it to a calendar.")
        response = HttpResponse(calendar_text(appointment), content_type="text/calendar")
        response["Content-Disposition"] = 'attachment; filename="consultation.ics"'
        return response


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        queryset = Conversation.objects.select_related(
            "project", "project__client"
        ).prefetch_related("messages").order_by("-updated_at")
        return queryset if self.request.user.is_admin else queryset.filter(project__client=self.request.user, project__deleted_at__isnull=True)

    @action(detail=True, methods=["post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation, sender=request.user)
        conversation.save(update_fields=["updated_at"])
        audit(request, "message.create", message)
        recipient = (
            conversation.project.client.email
            if request.user.is_admin
            else User.objects.filter(role=User.Role.ADMIN, is_active=True).values_list("email", flat=True).first()
        )
        if recipient:
            queue_email(
                f"New message: {conversation.subject}",
                f"A new portal message is waiting at {settings.FRONTEND_URL}/dashboard/messages.",
                [recipient],
                html=branded_email("You have a new message.",
                    paragraphs=["A new message is waiting in your project conversation."],
                    details=[("Conversation", conversation.subject)],
                    action=("Read your message", f"{settings.FRONTEND_URL}/dashboard/messages")),
            )
        return Response(MessageSerializer(message).data, status=201)


class AssetViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AssetSerializer

    def get_queryset(self):
        queryset = Asset.objects.filter(deleted_at__isnull=True, uploaded=True)
        if self.request.user.is_admin:
            return queryset
        return queryset.filter(models.Q(owner=self.request.user) | models.Q(project__client=self.request.user, project__deleted_at__isnull=True) | models.Q(brief__client=self.request.user, brief__deleted_at__isnull=True))

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])
        audit(self.request, "asset.archive", instance)
