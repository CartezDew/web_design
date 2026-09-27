from django.contrib import admin

from accounts.models import Invitation, User
from assets.models import Asset
from audit.models import AuditEvent
from communications.models import Conversation, Message
from intakes.models import ProjectBrief
from projects.models import Project, ProjectStatusHistory
from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule

admin.site.site_header = "Marc-D Group administration"
admin.site.site_title = "Marc-D Admin"

for model in [
    User,
    Invitation,
    ProjectBrief,
    Project,
    ProjectStatusHistory,
    Asset,
    AvailabilityRule,
    AvailabilityOverride,
    Appointment,
    Conversation,
    Message,
    AuditEvent,
]:
    admin.site.register(model)
