import json
from datetime import timedelta
from unittest.mock import patch

from django.test import Client, TestCase, override_settings
from django.utils import timezone

from api import test_microsoft_email as email_tests
from communications.microsoft_authorization import authorization_callback, start_authorization, state_hash
from communications.models import MicrosoftMailAuthorization, MicrosoftMailCredential


MAILBOX = email_tests.MAILBOX


class MicrosoftBrowserAuthorizationTests(TestCase):
    def setUp(self):
        email_tests.MicrosoftEmailTests.setUp(self)
        self.web_settings = override_settings(
            MICROSOFT_CLIENT_CERTIFICATE_KEY="private-test-placeholder",
            MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT="A" * 40,
            MICROSOFT_AUTH_REDIRECT_URI="https://api.example.test/api/v1/email/microsoft/callback/",
            ALLOWED_HOSTS=["testserver", "api.example.test"],
            STORAGES={
                "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
                "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
            },
        )
        self.web_settings.enable()
        self.addCleanup(self.web_settings.disable)
        self.callback = "/api/v1/email/microsoft/callback/"
        self.flow = {"state": "test-owner-state", "code_verifier": "private-test-verifier",
                     "nonce": "test-nonce", "auth_uri": "https://login.microsoftonline.com/test/authorize"}

    def attempt(self, expired=False):
        return MicrosoftMailAuthorization.objects.create(
            state_hash=state_hash(self.flow["state"]),
            encrypted_flow=self.cipher.encrypt(json.dumps(self.flow).encode()).decode(),
            expires_at=timezone.now() + timedelta(minutes=-1 if expired else 15),
        )

    @patch("communications.microsoft_authorization.application")
    def test_start_uses_form_post_pkce_and_encrypted_verifier(self, application):
        application.return_value.initiate_auth_code_flow.return_value = self.flow
        self.assertEqual(start_authorization(), self.flow["auth_uri"])
        row = MicrosoftMailAuthorization.objects.get()
        self.assertNotIn("private-test-verifier", row.encrypted_flow)
        self.assertEqual(json.loads(self.cipher.decrypt(row.encrypted_flow.encode())), self.flow)
        args = application.return_value.initiate_auth_code_flow.call_args
        self.assertEqual(args.kwargs["response_mode"], "form_post")
        self.assertEqual(args.kwargs["login_hint"], MAILBOX)
        self.assertGreaterEqual(len(args.kwargs["state"]), 40)

    @patch("communications.microsoft_authorization.application")
    def test_wrong_or_expired_state_cannot_exchange_a_code(self, application):
        self.attempt(expired=True)
        self.assertEqual(self.client.post(self.callback, {"state": "wrong", "code": "private-code"}).status_code, 400)
        self.assertEqual(self.client.post(self.callback, {"state": self.flow["state"], "code": "private-code"}).status_code, 400)
        application.assert_not_called()
        self.assertFalse(MicrosoftMailCredential.objects.exists())

    @patch("communications.microsoft_authorization.application")
    def test_owner_can_authorize_once_without_django_csrf_or_portal_login(self, application):
        row = self.attempt()
        app = application.return_value
        app.get_accounts.return_value = [{"username": MAILBOX}]
        app.acquire_token_by_auth_code_flow.return_value = {"access_token": "private-test-token"}
        client = Client(enforce_csrf_checks=True)
        response = client.post(self.callback, {"state": self.flow["state"], "code": "private-code"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Website email connected")
        self.assertNotContains(response, "private-test-token")
        self.assertNotContains(response, "private-code")
        self.assertIn("no-store", response["Cache-Control"])
        self.assertTrue(MicrosoftMailCredential.objects.exists())
        row.refresh_from_db()
        self.assertIsNotNone(row.claimed_at)
        self.assertIn("default", authorization_callback._non_atomic_requests)
        self.assertEqual(client.post(self.callback, {"state": self.flow["state"], "code": "private-code"}).status_code, 400)
        app.acquire_token_by_auth_code_flow.assert_called_once()

    @patch("communications.microsoft_authorization.application")
    def test_a_different_mailbox_cannot_replace_owner_authorization(self, application):
        self.attempt()
        app = application.return_value
        app.get_accounts.return_value = [{"username": "other@example.test"}]
        app.acquire_token_by_auth_code_flow.return_value = {"access_token": "private-test-token"}
        response = self.client.post(self.callback, {"state": self.flow["state"], "code": "private-code"})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(MicrosoftMailCredential.objects.exists())

    @patch("communications.microsoft_authorization.application")
    def test_consent_failure_never_exposes_microsoft_details(self, application):
        self.attempt()
        application.return_value.acquire_token_by_auth_code_flow.return_value = {
            "error": "access_denied", "error_description": "private-provider-details"}
        response = self.client.post(self.callback, {"state": self.flow["state"], "error": "access_denied"})
        self.assertEqual(response.status_code, 400)
        self.assertNotContains(response, "private-provider-details", status_code=400)
