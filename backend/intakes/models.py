import uuid
from django.db import models
from audit.models import SoftDeleteModel, TimeStampedModel


class ProjectBrief(SoftDeleteModel, TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        ACCEPTED = "accepted", "Accepted"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW, db_index=True)
    company = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=32, blank=True)
    overview = models.TextField(blank=True)
    mission = models.TextField(blank=True)
    success = models.TextField(blank=True)
    pages = models.CharField(max_length=50, blank=True)
    goal = models.CharField(max_length=100, blank=True)
    offerings = models.TextField(blank=True)
    features = models.TextField(blank=True)
    inspiration_link = models.URLField(max_length=1000, blank=True)
    domain = models.CharField(max_length=253, blank=True)
    launch_date = models.DateField(null=True, blank=True)
    brand = models.TextField(blank=True)
    integrations = models.TextField(blank=True)
    package = models.CharField(max_length=100, blank=True)
    referral = models.CharField(max_length=200, blank=True)
    social_urls = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    client = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="briefs"
    )
    idempotency_key = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["-created_at"]
