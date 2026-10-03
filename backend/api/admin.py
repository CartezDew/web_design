from django.contrib import admin

from accounts.models import Invitation, User
from assets.models import Asset
from audit.models import AuditEvent
from communications.models import Conversation, Message, EmailDelivery
from intakes.models import ProjectBrief
from projects.models import Project, ProjectStatusHistory
from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule

admin.site.site_header = "Marc-D Group administration"
admin.site.site_title = "Marc-D Admin"

class InspectionAdmin(admin.ModelAdmin):
    """Business changes go through the portal's authorization and service logic."""
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

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
    admin.site.register(model, InspectionAdmin)


@admin.register(EmailDelivery)
class EmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ["subject", "attempts", "sent_at", "last_error", "created_at"]
    list_filter = ["sent_at"]
    readonly_fields = [field.name for field in EmailDelivery._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
