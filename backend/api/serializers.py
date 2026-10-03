from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers

from accounts.models import User
from assets.models import Asset
from communications.models import Conversation, Message
from intakes.models import ProjectBrief
from projects.models import Project, ProjectStatusHistory
from scheduling.models import Appointment, AvailabilityOverride, AvailabilityRule


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "company", "phone", "role", "is_admin"]
        read_only_fields = ["id", "email", "role", "is_admin"]


class AssetSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "id", "group", "original_name", "content_type", "size", "uploaded",
            "download_url", "created_at",
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        if not obj.uploaded:
            return None
        from api.storage import signed_download_url
        try:
            return signed_download_url(obj)
        except Exception:
            import logging
            logging.getLogger(__name__).warning("Signed download unavailable for asset %s", obj.pk)
            return None


class ProjectBriefSerializer(serializers.ModelSerializer):
    assets = serializers.SerializerMethodField()

    def get_assets(self, obj):
        return AssetSerializer(obj.assets.filter(deleted_at__isnull=True, uploaded=True), many=True).data

    class Meta:
        model = ProjectBrief
        fields = [
            "id", "status", "company", "name", "email", "phone", "overview", "mission",
            "success", "pages", "goal", "offerings", "features", "inspiration_link",
            "domain", "launch_date", "brand", "integrations", "package", "referral",
            "social_urls", "notes", "assets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "assets", "created_at", "updated_at"]


class PublicBriefCreateSerializer(ProjectBriefSerializer):
    overview = serializers.CharField(required=True, allow_blank=False, max_length=10000)
    idempotency_key = serializers.CharField(write_only=True, max_length=100)
    turnstile_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(ProjectBriefSerializer.Meta):
        fields = ProjectBriefSerializer.Meta.fields + ["idempotency_key", "turnstile_token"]

    def create(self, validated_data):
        validated_data.pop("turnstile_token", None)
        return super().create(validated_data)


class ProjectStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSerializer(read_only=True)

    class Meta:
        model = ProjectStatusHistory
        fields = ["id", "status", "note", "changed_by", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        source="client", queryset=User.objects.filter(role=User.Role.CLIENT), write_only=True
    )
    brief_id = serializers.PrimaryKeyRelatedField(
        source="brief", queryset=ProjectBrief.objects.all(), write_only=True, required=False, allow_null=True
    )
    assets = serializers.SerializerMethodField()

    def get_assets(self, obj):
        from django.db.models import Q
        query = Q(project=obj)
        if obj.brief_id:
            query |= Q(brief_id=obj.brief_id)
        return AssetSerializer(Asset.objects.filter(query, deleted_at__isnull=True, uploaded=True), many=True).data

    status_history = ProjectStatusHistorySerializer(many=True, read_only=True)
    brief = ProjectBriefSerializer(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "status", "summary", "target_launch_date", "client", "client_id", "brief_id",
            "brief", "assets", "status_history", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "client", "brief", "assets", "status_history", "created_at", "updated_at"]


class ProjectStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Project.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.save(update_fields=["status", "updated_at"])
        ProjectStatusHistory.objects.create(
            project=instance,
            status=instance.status,
            note=validated_data.get("note", ""),
            changed_by=self.context["request"].user,
        )
        return instance

    def create(self, validated_data):
        raise NotImplementedError


class AvailabilityRuleSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        step = attrs.get("slot_minutes", getattr(self.instance, "slot_minutes", 30))
        if not start or not end or end <= start or not 30 <= step <= 240:
            raise serializers.ValidationError("Use increasing hours and a slot interval of 30–240 minutes.")
        if not 0 <= attrs.get("weekday", getattr(self.instance, "weekday", 0)) <= 6:
            raise serializers.ValidationError("Choose a day from Monday to Sunday.")
        return attrs

    class Meta:
        model = AvailabilityRule
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AvailabilityOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityOverride
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        blocked = attrs.get("is_blocked", getattr(self.instance, "is_blocked", False))
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if not blocked and (not start or not end or end <= start):
            raise serializers.ValidationError("Open overrides require increasing start and end times.")
        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        source="client",
        queryset=User.objects.filter(role=User.Role.CLIENT),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Appointment
        fields = [
            "id", "first_name", "last_name", "email", "starts_at", "ends_at",
            "status", "notes", "project", "client_id", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "ends_at", "created_at", "updated_at"]

    def validate_project(self, project):
        request = self.context.get("request")
        if project and request and not request.user.is_admin and project.client_id != request.user.id:
            raise serializers.ValidationError("Choose one of your own projects.")
        return project

    def validate_status(self, value):
        request = self.context.get("request")
        if request and not request.user.is_admin and value != (self.instance.status if self.instance else "pending"):
            raise serializers.ValidationError("Clients cannot change appointment status directly.")
        return value


class PublicAppointmentSerializer(serializers.ModelSerializer):
    idempotency_key = serializers.CharField(write_only=True, validators=[])
    starts_at = serializers.DateTimeField(validators=[])
    turnstile_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "first_name", "last_name", "email", "starts_at",
            "idempotency_key", "turnstile_token",
        ]
        read_only_fields = ["id"]
        validators = []

    def create(self, validated_data):
        from datetime import timedelta

        validated_data.pop("turnstile_token", None)
        validated_data["ends_at"] = validated_data["starts_at"] + timedelta(minutes=30)
        return super().create(validated_data)


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "body", "read_at", "created_at"]
        read_only_fields = ["id", "sender", "read_at", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    project_id = serializers.UUIDField(source="project.id", read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "project_id", "subject", "messages", "updated_at"]


class InvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value
