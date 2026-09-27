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
from django.core.mail import send_mail
from django.db import IntegrityError, models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
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


class PublicFormThrottle(AnonRateThrottle):
    scope = "public_form"


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) or None


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


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"})


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.middleware.csrf import get_token
        return Response({"csrfToken": get_token(request)})


class SessionView(APIView):
    permission_classes = [permissions.AllowAny]

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
            send_mail("Reset your Marc-D portal password", f"Reset your password: {url}", None, [user.email])
        return Response({"detail": "If the account exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            user_id = force_str(urlsafe_base64_decode(request.data.get("uid", "")))
            user = User.objects.get(pk=user_id)
        except (ValueError, TypeError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired reset link."}, status=400)
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=400)
        from django.contrib.auth import password_validation
        password_validation.validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


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
        login(request, user)
        audit(request, "invitation.accept", invitation)
        return Response({"user": UserSerializer(user).data})


class PublicBriefCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicFormThrottle]
    serializer_class = PublicBriefCreateSerializer

    def create(self, request, *args, **kwargs):
        if not verify_turnstile(request.data.get("turnstile_token"), client_ip(request)):
            return Response({"detail": "Please complete the security check."}, status=400)
        key = request.data.get("idempotency_key")
        existing = ProjectBrief.objects.filter(idempotency_key=key).first() if key else None
        if existing:
            return Response(ProjectBriefSerializer(existing).data)
        response = super().create(request, *args, **kwargs)
        brief = ProjectBrief.objects.get(pk=response.data["id"])
        audit(request, "brief.create", brief)
        send_mail(
            f"New project brief: {brief.company}",
            f"{brief.name} submitted a new project brief. Review it at {settings.FRONTEND_URL}/dashboard.",
            None,
            [settings.ADMIN_NOTIFICATION_EMAIL],
            fail_silently=True,
        )
        return response


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
    authentication_classes = []
    throttle_classes = [PublicFormThrottle]
    serializer_class = PublicAppointmentSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if not verify_turnstile(request.data.get("turnstile_token"), client_ip(request)):
            return Response({"detail": "Please complete the security check."}, status=400)
        key = request.data.get("idempotency_key")
        existing = Appointment.objects.filter(idempotency_key=key).first() if key else None
        if existing:
            return Response(AppointmentSerializer(existing).data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        starts_at = serializer.validated_data["starts_at"]
        if starts_at not in available_starts(starts_at.astimezone(ZoneInfo("America/New_York")).date()):
            return Response({"starts_at": ["That time is no longer available."]}, status=409)
        try:
            appointment = serializer.save()
        except IntegrityError:
            return Response({"starts_at": ["That time is no longer available."]}, status=409)
        audit(request, "appointment.create", appointment)
        send_mail(
            "New consultation request",
            f"{appointment.first_name} {appointment.last_name} requested {appointment.starts_at}.",
            None,
            [settings.ADMIN_NOTIFICATION_EMAIL],
            fail_silently=True,
        )
        return Response(AppointmentSerializer(appointment).data, status=201)


class AdminBriefViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = ProjectBriefSerializer
    queryset = ProjectBrief.objects.filter(deleted_at__isnull=True).prefetch_related("assets")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])
        audit(self.request, "brief.archive", instance)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def invite(self, request, pk=None):
        brief = self.get_object()
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
        project, project_created = Project.objects.get_or_create(
            brief=brief,
            defaults={
                "client": user,
                "name": request.data.get("project_name") or f"{brief.company} website",
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
            send_mail(
                "A project was added to your Marc-D portal",
                f"Sign in to view {project.name}: {settings.FRONTEND_URL}/sign-in",
                None,
                [email],
            )
            audit(request, "client.project_link", project)
            return Response({"detail": "Existing client notified.", "project": ProjectSerializer(project).data})
        invitation, raw = Invitation.issue(email=email, invited_by=request.user, project=project)
        url = f"{settings.FRONTEND_URL}/accept-invitation?token={raw}"
        send_mail(
            "Your Marc-D client portal invitation",
            f"Set up your client portal within 48 hours: {url}",
            None,
            [email],
        )
        audit(request, "client.invite", invitation, {"project_id": str(project.id)})
        return Response({"detail": "Invitation sent.", "project": ProjectSerializer(project).data})


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
        send_mail(
            f"{project.name} status update",
            f"Your project is now in {project.get_status_display()}. View details: {settings.FRONTEND_URL}/dashboard",
            None,
            [project.client.email],
            fail_silently=True,
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
        starts_at = serializer.validated_data["starts_at"]
        if starts_at not in available_starts(starts_at.astimezone(ZoneInfo("America/New_York")).date()):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"starts_at": "That time is no longer available."})
        requested_client = serializer.validated_data.pop("client", None)
        serializer.save(
            client=requested_client if self.request.user.is_admin else self.request.user,
            ends_at=starts_at + timedelta(minutes=30),
            idempotency_key=str(uuid.uuid4()),
        )

    def perform_update(self, serializer):
        starts_at = serializer.validated_data.get("starts_at", serializer.instance.starts_at)
        if starts_at != serializer.instance.starts_at:
            slots = available_starts(starts_at.astimezone(ZoneInfo("America/New_York")).date())
            if starts_at not in slots:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"starts_at": "That time is no longer available."})
        appointment = serializer.save(ends_at=starts_at + timedelta(minutes=30))
        audit(self.request, "appointment.update", appointment)

    def perform_destroy(self, instance):
        instance.status = Appointment.Status.CANCELLED
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["status", "deleted_at", "updated_at"])
        audit(self.request, "appointment.cancel", instance)


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        queryset = Conversation.objects.select_related(
            "project", "project__client"
        ).prefetch_related("messages").order_by("-updated_at")
        return queryset if self.request.user.is_admin else queryset.filter(project__client=self.request.user)

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
            send_mail(
                f"New message: {conversation.subject}",
                f"A new portal message is waiting at {settings.FRONTEND_URL}/dashboard/messages.",
                None,
                [recipient],
                fail_silently=True,
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
        return queryset.filter(models.Q(owner=self.request.user) | models.Q(project__client=self.request.user))

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])
        audit(self.request, "asset.archive", instance)


class AssetPrepareView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        group = request.data.get("group")
        content_type = request.data.get("content_type")
        size = int(request.data.get("size", 0))
        original_name = str(request.data.get("name", ""))[:255]
        brief = None
        project = None
        owner = request.user if request.user.is_authenticated else None

        allowed_extensions = {
            "image/jpeg": {".jpg", ".jpeg"},
            "image/png": {".png"},
            "image/webp": {".webp"},
            "application/pdf": {".pdf"},
        }
        extension = "." + original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        if content_type not in allowed_extensions or extension not in allowed_extensions.get(content_type, set()):
            return Response({"detail": "Unsupported file type."}, status=400)
        if size <= 0 or size > settings.MAX_UPLOAD_FILE_BYTES:
            return Response({"detail": "Files must be 5 MB or smaller."}, status=400)

        if request.user.is_authenticated:
            project_id = request.data.get("project")
            project = get_object_or_404(Project, pk=project_id, deleted_at__isnull=True)
            if not request.user.is_admin and project.client_id != request.user.id:
                return Response(status=403)
            if group not in {Asset.Group.PROJECT, Asset.Group.MESSAGE}:
                return Response({"detail": "Invalid project asset group."}, status=400)
        else:
            brief = get_object_or_404(ProjectBrief, pk=request.data.get("brief"))
            if brief.idempotency_key != request.data.get("idempotency_key"):
                return Response(status=403)
            if group not in {Asset.Group.INSPIRATION, Asset.Group.BRAND}:
                return Response({"detail": "Invalid brief asset group."}, status=400)
            group_assets = brief.assets.filter(group=group, deleted_at__isnull=True)
            if group_assets.count() >= settings.MAX_UPLOAD_FILES_PER_GROUP:
                return Response({"detail": "No more than 12 files are allowed per group."}, status=400)
            total_bytes = (
                brief.assets.filter(deleted_at__isnull=True).aggregate(total=models.Sum("size"))["total"] or 0
            )
            if total_bytes + size > settings.MAX_BRIEF_UPLOAD_BYTES:
                return Response({"detail": "Combined brief uploads cannot exceed 25 MB."}, status=400)

        object_name = f"{'projects' if project else 'briefs'}/{project.pk if project else brief.pk}/{uuid.uuid4()}"
        asset = Asset.objects.create(
            owner=owner,
            brief=brief,
            project=project,
            group=group,
            object_name=object_name,
            original_name=original_name,
            content_type=content_type,
            size=size,
        )
        return Response({"asset": AssetSerializer(asset).data, "upload_url": signed_upload_url(asset)}, status=201)


class AssetFinalizeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk, deleted_at__isnull=True)
        if request.user.is_authenticated:
            project = asset.project
            if not request.user.is_admin and (not project or project.client_id != request.user.id):
                return Response(status=403)
        elif not asset.brief or asset.brief.idempotency_key != request.data.get("idempotency_key"):
            return Response(status=403)
        valid, message = validate_uploaded_blob(asset)
        if not valid:
            asset.delete()
            return Response({"detail": message}, status=400)
        asset.uploaded = True
        asset.save(update_fields=["uploaded", "updated_at"])
        audit(request, "asset.finalize", asset)
        return Response(AssetSerializer(asset).data)
