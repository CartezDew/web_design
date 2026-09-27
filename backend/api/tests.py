from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Invitation, User
from assets.models import Asset
from communications.models import Conversation
from intakes.models import ProjectBrief
from projects.models import Project
from scheduling.models import Appointment, AvailabilityRule


def brief_data(key="brief-key"):
    return {
        "company": "Acme",
        "name": "Alex Client",
        "email": "alex@example.com",
        "idempotency_key": key,
    }


class PublicApiTests(TestCase):
    def test_brief_is_idempotent(self):
        response = self.client.post("/api/v1/public/briefs/", brief_data(), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        second = self.client.post("/api/v1/public/briefs/", brief_data(), content_type="application/json")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(ProjectBrief.objects.count(), 1)

    def test_booking_conflict_is_rejected(self):
        future = timezone.now().astimezone(ZoneInfo("America/New_York")) + timedelta(days=3)
        start = future.replace(hour=11, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(
            weekday=start.weekday(), start_time=time(10, 30), end_time=time(12), slot_minutes=30
        )
        payload = {
            "first_name": "Alex",
            "last_name": "Client",
            "email": "alex@example.com",
            "starts_at": start.astimezone(ZoneInfo("UTC")).isoformat(),
            "idempotency_key": "appointment-one",
        }
        first = self.client.post("/api/v1/public/appointments/", payload, content_type="application/json")
        self.assertEqual(first.status_code, 201)
        payload["idempotency_key"] = "appointment-two"
        second = self.client.post("/api/v1/public/appointments/", payload, content_type="application/json")
        self.assertEqual(second.status_code, 409, second.data)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_upload_rejects_unsupported_or_oversized_files_before_storage(self):
        brief = ProjectBrief.objects.create(**brief_data("upload-key"))
        wrong_type = self.client.post(
            "/api/v1/assets/prepare/",
            {
                "brief": str(brief.id),
                "idempotency_key": "upload-key",
                "group": "inspiration",
                "name": "malware.exe",
                "content_type": "application/octet-stream",
                "size": 100,
            },
            content_type="application/json",
        )
        self.assertEqual(wrong_type.status_code, 400)
        oversized = self.client.post(
            "/api/v1/assets/prepare/",
            {
                "brief": str(brief.id),
                "idempotency_key": "upload-key",
                "group": "inspiration",
                "name": "large.pdf",
                "content_type": "application/pdf",
                "size": 5 * 1024 * 1024 + 1,
            },
            content_type="application/json",
        )
        self.assertEqual(oversized.status_code, 400)


class AuthenticationAndAuthorizationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("admin@example.com", "strong-admin-password")
        self.client_user = User.objects.create_user("client@example.com", "strong-client-password")
        self.other_user = User.objects.create_user("other@example.com", "strong-other-password")
        self.project = Project.objects.create(client=self.client_user, name="Client project")
        Project.objects.create(client=self.other_user, name="Other project")

    def test_session_login_and_logout(self):
        api = APIClient()
        response = api.post(
            "/api/v1/auth/session/",
            {"email": self.client_user.email, "password": "strong-client-password"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["email"], self.client_user.email)
        self.assertEqual(api.delete("/api/v1/auth/session/").status_code, 204)

    def test_client_only_sees_owned_projects(self):
        api = APIClient()
        api.force_authenticate(self.client_user)
        response = api.get("/api/v1/projects/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.project.id))

    def test_client_cannot_access_admin_api(self):
        api = APIClient()
        api.force_authenticate(self.client_user)
        self.assertEqual(api.get("/api/v1/admin/projects/").status_code, 403)

    def test_invitation_is_single_use(self):
        invitation, raw = Invitation.issue(
            email="invitee@example.com", invited_by=self.admin, project=self.project
        )
        response = self.client.post(
            "/api/v1/auth/invitations/accept/",
            {
                "token": raw,
                "first_name": "Invited",
                "last_name": "Client",
                "password": "unique-long-password-548!",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        invitation.refresh_from_db()
        self.assertIsNotNone(invitation.accepted_at)
        replay = self.client.post(
            "/api/v1/auth/invitations/accept/",
            {
                "token": raw,
                "first_name": "Invited",
                "last_name": "Client",
                "password": "unique-long-password-548!",
            },
            content_type="application/json",
        )
        self.assertEqual(replay.status_code, 400)

    def test_admin_can_approve_brief_and_create_portal(self):
        brief = ProjectBrief.objects.create(**brief_data("approval-key"))
        api = APIClient()
        api.force_authenticate(self.admin)
        response = api.post(f"/api/v1/admin/briefs/{brief.id}/invite/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(brief=brief)
        self.assertTrue(Conversation.objects.filter(project=project).exists())
        brief.refresh_from_db()
        self.assertEqual(brief.status, ProjectBrief.Status.ACCEPTED)

    def test_client_asset_list_is_owner_scoped(self):
        Asset.objects.create(
            owner=self.client_user,
            project=self.project,
            group=Asset.Group.PROJECT,
            object_name="projects/client/one",
            original_name="client.pdf",
            content_type="application/pdf",
            size=100,
            uploaded=True,
        )
        other_project = Project.objects.get(client=self.other_user)
        Asset.objects.create(
            owner=self.other_user,
            project=other_project,
            group=Asset.Group.PROJECT,
            object_name="projects/other/one",
            original_name="other.pdf",
            content_type="application/pdf",
            size=100,
            uploaded=True,
        )
        api = APIClient()
        api.force_authenticate(self.client_user)
        response = api.get("/api/v1/assets/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["original_name"], "client.pdf")


class ProductionSafetyTests(TestCase):
    @override_settings(DJANGO_ENV="production")
    def test_flush_is_blocked_in_production(self):
        with self.assertRaises(CommandError):
            call_command("flush", interactive=False)

    @override_settings(DJANGO_ENV="production")
    def test_migrate_requires_explicit_production_approval(self):
        with self.assertRaises(CommandError):
            call_command("migrate", interactive=False)
