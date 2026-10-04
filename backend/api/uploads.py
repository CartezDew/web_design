"""Upload reservations share the same locked quota across an intake and its project."""
import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.fields import UUIDField
from assets.models import Asset
from intakes.models import ProjectBrief
from projects.models import Project
from api.tokens import require_token
from api.storage import signed_upload_url, validate_uploaded_blob
from api.serializers import AssetSerializer
from api.file_types import ALLOWED, FORMAT_MESSAGE

TTL = timedelta(minutes=20)


def scope_assets(brief, project):
    query = models.Q(project=project) if project else models.Q(pk__isnull=True)
    if brief:
        query |= models.Q(brief=brief) | models.Q(project__brief=brief)
    return Asset.objects.filter(query, deleted_at__isnull=True).filter(
        models.Q(uploaded=True) | models.Q(created_at__gt=timezone.now() - TTL))


def authorize_asset(request, asset):
    if request.user.is_authenticated and (request.user.is_admin or
        (asset.project and asset.project.client_id == request.user.pk and not asset.project.deleted_at) or
        (asset.brief and asset.brief.client_id == request.user.pk and not asset.brief.deleted_at)):
        return
    if asset.brief and not asset.brief.deleted_at:
        require_token(request.data.get("upload_token"), "upload", asset.brief_id)
        return
    raise PermissionDenied()


class AssetPrepareView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        try:
            size = int(request.data.get("size", 0))
            key = str(uuid.UUID(str(request.data.get("request_key", ""))))
        except (ValueError, TypeError):
            raise ValidationError("Supply a valid file size and upload request identifier.")
        content_type = request.data.get("content_type")
        name = str(request.data.get("name", ""))[:255]
        if any(ord(c) < 32 for c in name) or content_type not in ALLOWED or name.rsplit(".", 1)[-1].lower() not in ALLOWED[content_type]:
            raise ValidationError(FORMAT_MESSAGE)
        if size <= 0 or size > settings.MAX_UPLOAD_FILE_BYTES:
            raise ValidationError("Each file must be nonempty and no larger than 5 MB.")
        brief = project = None
        if request.data.get("brief"):
            brief = get_object_or_404(ProjectBrief.objects.select_for_update(), pk=UUIDField().run_validation(request.data["brief"]), deleted_at__isnull=True)
            require_token(request.data.get("upload_token"), "upload", brief.pk)
            group = request.data.get("group", "inspiration")
            if group not in ["brand", "inspiration", "people"]:
                raise ValidationError("Choose a brief attachment category.")
            project = Project.objects.filter(brief=brief, deleted_at__isnull=True).first()
        else:
            if not request.user.is_authenticated:
                raise PermissionDenied()
            project = get_object_or_404(Project, pk=UUIDField().run_validation(request.data.get("project")), deleted_at__isnull=True)
            if not request.user.is_admin and project.client_id != request.user.pk:
                raise PermissionDenied()
            if project.brief_id:
                brief = ProjectBrief.objects.select_for_update().get(pk=project.brief_id)
            else:
                project = Project.objects.select_for_update().get(pk=project.pk)
            group = request.data.get("group", "project")
            if group not in ["project", "message"]:
                raise ValidationError("Choose a project attachment category.")
        collection = scope_assets(brief, project)
        existing = collection.filter(request_key=key).first()
        if existing:
            if (existing.original_name, existing.size, existing.content_type) != (name, size, content_type):
                raise ValidationError("This upload identifier belongs to a different file.")
            return Response({"asset": AssetSerializer(existing).data,
                             "upload_url": None if existing.uploaded else signed_upload_url(existing)})
        if Asset.objects.filter(request_key=key).exists():
            raise ValidationError("This upload attempt has expired. Remove the file and select it again.")
        if collection.count() >= settings.MAX_UPLOAD_FILES:
            raise ValidationError("Your brief and project can contain no more than 12 files combined.")
        total = collection.aggregate(total=models.Sum("size"))["total"] or 0
        if total + size > settings.MAX_BRIEF_UPLOAD_BYTES:
            raise ValidationError("Your brief and project files cannot exceed 25 MB combined.")
        asset = Asset.objects.create(owner=request.user if request.user.is_authenticated else None,
            brief=brief if request.data.get("brief") else None, project=project if not request.data.get("brief") else None,
            group=group, object_name=f"pending/{uuid.uuid4()}", original_name=name,
            content_type=content_type, size=size, request_key=key)
        try:
            url = signed_upload_url(asset)
        except Exception:
            raise ValidationError("File storage is temporarily unavailable. Your brief is saved; please retry the files shortly.")
        return Response({"asset": AssetSerializer(asset).data, "upload_url": url}, status=201)


class AssetFinalizeView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, pk):
        asset = get_object_or_404(Asset.objects.select_related("project"), pk=pk, deleted_at__isnull=True)
        authorize_asset(request, asset)
        # Match reservation lock order. A reservation cannot age out and be
        # replaced while its file is being verified and made permanent.
        brief_id = asset.brief_id or (asset.project.brief_id if asset.project else None)
        if brief_id:
            ProjectBrief.objects.select_for_update().get(pk=brief_id)
        elif asset.project_id:
            Project.objects.select_for_update().get(pk=asset.project_id)
        asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk, deleted_at__isnull=True)
        if asset.uploaded:
            return Response(AssetSerializer(asset).data)
        if asset.created_at <= timezone.now() - TTL:
            raise ValidationError("This upload has expired. Remove it and select it again.")
        valid, message = validate_uploaded_blob(asset)
        if not valid:
            asset.deleted_at = timezone.now()
            asset.save(update_fields=["deleted_at"])
            return Response({"detail": message}, status=400)
        asset.uploaded = True
        asset.save(update_fields=["uploaded", "object_name", "updated_at"])
        return Response(AssetSerializer(asset).data)


class AssetReleaseView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        authorize_asset(request, asset)
        asset.deleted_at = timezone.now()
        asset.save(update_fields=["deleted_at", "updated_at"])
        return Response(status=204)
