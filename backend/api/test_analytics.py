from datetime import time, timedelta
from unittest.mock import patch, Mock
import json

import requests
from django.db import transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from api.analytics import acquisition_context, record_lead
from api.tests import brief_data
from intakes.models import ProjectBrief
from projects.models import Project
from scheduling.models import Appointment, AvailabilityRule
from scheduling.services import EASTERN


CONTEXT = {"consent": True, "client_id": "12345.12345678", "session_id": "12345678",
           "campaign_source": "linkedin", "campaign_medium": "social", "campaign_id": "web_launch",
           "device_category": "mobile", "email": "do-not-send@example.test", "token": "never"}


@override_settings(GA_MEASUREMENT_ID="G-TEST12345", GA_API_SECRET="server-only-secret")
class AnalyticsTests(TestCase):
    def test_public_config_never_exposes_secret(self):
        data = self.client.get("/api/v1/public/analytics-config/").json()
        self.assertEqual(data, {"measurement_id": "G-TEST12345", "server_conversions": True})
        self.assertNotIn("server-only-secret", json.dumps(data))

    def test_acquisition_is_allowlisted_and_requires_explicit_consent(self):
        self.assertEqual(acquisition_context({**CONTEXT, "consent": "true"}), {})
        self.assertEqual(acquisition_context(None), {})
        clean = acquisition_context({**CONTEXT, "campaign_id": "https://example.test/?token=private", "campaign_content": "alex@example.test"})
        self.assertEqual(clean, {"campaign_source": "linkedin", "campaign_medium": "social", "device_category": "mobile"})

    @patch("api.analytics.requests.post")
    def test_new_saved_brief_sends_one_conversion_after_commit_without_private_data(self, send):
        send.return_value.status_code = 204
        payload = {**brief_data(), "analytics": CONTEXT, "business_type": "retail", "service_interest": "web-design",
                   "package": "Business", "goal": "Sell products", "notes": "private notes"}
        with self.captureOnCommitCallbacks(execute=True):
            first = self.client.post("/api/v1/public/briefs/", payload, content_type="application/json")
            second = self.client.post("/api/v1/public/briefs/", payload, content_type="application/json")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(send.call_count, 1)
        google = send.call_args.kwargs["json"]
        params = google["events"][0]["params"]
        self.assertEqual(params["business_type"], "retail")
        self.assertEqual(params["primary_goal"], "sell_products")
        self.assertEqual(google["events"][0]["name"], "generate_lead")
        for private in ["Alex", "alex@example.com", "private notes", "do-not-send", "never", first.json()["id"]]:
            self.assertNotIn(private, json.dumps(google))
        brief = ProjectBrief.objects.get()
        self.assertEqual(brief.acquisition["campaign_source"], "linkedin")
        self.assertNotIn("client_id", brief.acquisition)
        self.assertNotIn("session_id", brief.acquisition)

    @patch("api.analytics.requests.post")
    def test_declined_missing_and_invalid_contexts_never_call_google(self, send):
        for i, context in enumerate([None, {}, {**CONTEXT, "consent": False}, {**CONTEXT, "client_id": "alex@example.test"}, {**CONTEXT, "session_id": "0"}]):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post("/api/v1/public/briefs/", {**brief_data(str(i)), "analytics": context}, content_type="application/json")
            self.assertEqual(response.status_code, 201)
        send.assert_not_called()

    @patch("api.analytics.requests.post")
    def test_rollback_and_validation_do_not_create_conversions(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                record = ProjectBrief.objects.create(**brief_data())
                record_lead(record, "brief", CONTEXT)
                transaction.set_rollback(True)
            response = self.client.post("/api/v1/public/briefs/", {**brief_data(), "business_type": "arbitrary private data", "analytics": CONTEXT}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        send.assert_not_called()

    @patch("api.analytics.requests.post", side_effect=requests.Timeout("secret URL must not be logged"))
    def test_google_outage_does_not_break_submission_or_expose_secret(self, send):
        with self.assertLogs("api.analytics", level="WARNING") as logs, self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/api/v1/public/briefs/", {**brief_data(), "analytics": CONTEXT}, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ProjectBrief.objects.count(), 1)
        self.assertNotIn("secret URL", "".join(logs.output))

    @patch("api.analytics.requests.post")
    def test_booking_success_and_conflict_do_not_double_count(self, send):
        send.return_value.status_code = 204
        start = (timezone.now().astimezone(EASTERN) + timedelta(days=3)).replace(hour=11, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(weekday=start.weekday(), start_time=time(10), end_time=time(16))
        payload = {"first_name": "Alex", "last_name": "Client", "email": "alex@example.test", "starts_at": start.isoformat(), "idempotency_key": "booking", "analytics": CONTEXT}
        with self.captureOnCommitCallbacks(execute=True):
            first = self.client.post("/api/v1/public/appointments/", payload, content_type="application/json")
            again = self.client.post("/api/v1/public/appointments/", payload, content_type="application/json")
            conflict = self.client.post("/api/v1/public/appointments/", {**payload, "idempotency_key": "another"}, content_type="application/json")
        self.assertEqual((first.status_code, again.status_code, conflict.status_code), (201, 200, 409))
        self.assertEqual(send.call_count, 1)
        self.assertEqual(send.call_args.kwargs["json"]["events"][0]["params"]["form_type"], "booking")


class InsightsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user("owner@example.test", "test-password", role="admin")
        self.customer = User.objects.create_user("client@example.test", "test-password")
        self.api = APIClient()

    def test_anonymous_and_clients_cannot_read_business_insights(self):
        self.assertEqual(self.api.get("/api/v1/admin/insights/").status_code, 403)
        self.api.force_authenticate(self.customer)
        self.assertEqual(self.api.get("/api/v1/admin/insights/").status_code, 403)

    def test_cohort_breakdowns_empty_history_and_deleted_records(self):
        a = ProjectBrief.objects.create(**brief_data("one"), business_type="retail", service_interest="web-design", email_verified_at=timezone.now())
        ProjectBrief.objects.create(**brief_data("two"), business_type="retail")
        ProjectBrief.objects.create(**brief_data("legacy"))
        ProjectBrief.objects.create(**brief_data("deleted"), deleted_at=timezone.now())
        old = ProjectBrief.objects.create(**brief_data("old"))
        ProjectBrief.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=95))
        Project.objects.create(brief=a, client=self.customer, name="Private client project", status="launched")
        self.api.force_authenticate(self.admin)
        data = self.api.get("/api/v1/admin/insights/?days=90").json()
        self.assertEqual(data["totals"]["briefs"], 3)
        self.assertEqual(data["totals"]["confirmed_briefs"], 1)
        self.assertEqual(data["totals"]["launched_projects"], 1)
        self.assertEqual(data["breakdowns"]["business_type"][0], {"value": "retail", "leads": 2, "projects": 1, "project_rate": 50.0})
        self.assertNotIn("alex@example.com", json.dumps(data))
        self.assertEqual(self.api.get("/api/v1/admin/insights/?days=365").json()["totals"]["briefs"], 4)
        self.assertEqual(self.api.get("/api/v1/admin/insights/?days=invalid").json()["days"], 90)
