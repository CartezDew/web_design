import uuid
from django.conf import settings
from django.db import models
from audit.models import SoftDeleteModel, TimeStampedModel


class Project(SoftDeleteModel, TimeStampedModel):
    class Status(models.TextChoices):
        DISCOVERY = "discovery", "Discovery"
        PLANNING = "planning", "Planning"
        DESIGN = "design", "Design"
        DEVELOPMENT = "development", "Development"
        REVIEW = "review", "Client review"
        LAUNCHED = "launched", "Launched"
        PAUSED = "paused", "Paused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="projects")
    brief = models.OneToOneField(
        "intakes.ProjectBrief", null=True, blank=True, on_delete=models.SET_NULL, related_name="project"
    )
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DISCOVERY)
    summary = models.TextField(blank=True)
    target_launch_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class ProjectStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=24, choices=Project.Status.choices)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
