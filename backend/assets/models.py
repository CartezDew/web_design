import uuid
from django.conf import settings
from django.db import models
from audit.models import SoftDeleteModel, TimeStampedModel


class Asset(SoftDeleteModel, TimeStampedModel):
    class Group(models.TextChoices):
        INSPIRATION = "inspiration", "Inspiration"
        BRAND = "brand", "Brand"
        PROJECT = "project", "Project"
        MESSAGE = "message", "Message"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    brief = models.ForeignKey(
        "intakes.ProjectBrief", null=True, blank=True, on_delete=models.CASCADE, related_name="assets"
    )
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.CASCADE, related_name="assets"
    )
    group = models.CharField(max_length=20, choices=Group.choices)
    object_name = models.CharField(max_length=500, unique=True)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    uploaded = models.BooleanField(default=False)
    request_key = models.CharField(max_length=100, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
