import base64
from unittest.mock import Mock, patch

from cryptography.fernet import Fernet
from django.core.mail import EmailMessage
from django.core.management import call_command
from django.test import TestCase, override_settings

from api.notifications import deliver_email
from communications.microsoft_email import (
    EmailBackend, MicrosoftEmailUnavailable, access_token, save_authorization,
)
from communications.models import EmailDelivery, MicrosoftMailCredential

CLIENT = "11111111-1111-4111-8111-111111111111"
TENANT = "22222222-2222-4222-8222-222222222222"
MAILBOX = "owner@example.test"


class MicrosoftEmailTests(TestCase):
    def setUp(self):
        self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)
        self.settings_override = override_settings(
            EMAIL_PROVIDER="microsoft365", MICROSOFT_CLIENT_ID=CLIENT,
            MICROSOFT_TENANT_ID=TENANT, MICROSOFT_TOKEN_ENCRYPTION_KEY=self.key.decode(),
            MICROSOFT_MAILBOX=MAILBOX, DEFAULT_FROM_EMAIL=f"Owner <{MAILBOX}>",
            EMAIL_BACKEND="communications.microsoft_email.EmailBackend",
            MICROSOFT_CLIENT_CERTIFICATE_KEY="", MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT="",
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

    def credential(self):
        return MicrosoftMailCredential.objects.create(
            mailbox=MAILBOX, client_id=CLIENT, tenant_id=TENANT,
            encrypted_cache=self.cipher.encrypt(b"{}").decode(),
        )

    def message(self):
        return EmailMessage("Consultation", "All appointments use Eastern time.",
                            f"Owner <{MAILBOX}>", ["Client <client@example.test>"],
                            bcc=["audit@example.test"])

    @patch("communications.microsoft_email.access_token", return_value="test-token")
    @patch("communications.microsoft_email.requests.post")
    def test_calendar_attachment_and_bcc_reach_graph(self, post, token):
        post.return_value.status_code = 202
        message = self.message()
        calendar = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"
        message.attach("consultation.ics", calendar, "text/calendar")
        self.assertEqual(EmailBackend().send_messages([message]), 1)
        body = post.call_args.kwargs["json"]
        self.assertTrue(body["saveToSentItems"])
        self.assertEqual(body["message"]["bccRecipients"][0]["emailAddress"]["address"], "audit@example.test")
        file = body["message"]["attachments"][0]
        self.assertEqual(file["contentType"], "text/calendar")
        self.assertEqual(base64.b64decode(file["contentBytes"]), calendar.encode())
        self.assertEqual(post.call_args.kwargs["timeout"], 20)

    @patch("communications.microsoft_email.requests.post")
    def test_sender_mismatch_is_rejected_before_authorization(self, post):
        message = self.message()
        message.from_email = "someone-else@example.test"
        with self.assertRaises(MicrosoftEmailUnavailable):
            EmailBackend().send_messages([message])
        post.assert_not_called()

    @patch("communications.microsoft_email.access_token", return_value="test-token")
    @patch("communications.microsoft_email.requests.post")
    def test_provider_failure_does_not_expose_private_response(self, post, token):
        post.return_value = Mock(status_code=403, text="private-token-and-client-details")
        with self.assertRaises(MicrosoftEmailUnavailable) as error:
            EmailBackend().send_messages([self.message()])
        self.assertNotIn("private-token", str(error.exception))
        self.assertEqual(EmailBackend(fail_silently=True).send_messages([self.message()]), 0)

    def test_authorization_is_encrypted_and_wrong_mailbox_is_not_saved(self):
        app = Mock()
        app.get_accounts.return_value = [{"username": "wrong@example.test"}]
        cache = Mock()
        cache.serialize.return_value = '{"refresh_token":"private-test-value"}'
        with self.assertRaises(MicrosoftEmailUnavailable):
            save_authorization(cache, app)
        self.assertFalse(MicrosoftMailCredential.objects.exists())
        app.get_accounts.return_value = [{"username": MAILBOX}]
        save_authorization(cache, app)
        row = MicrosoftMailCredential.objects.get()
        self.assertNotIn("private-test-value", row.encrypted_cache)
        self.assertEqual(self.cipher.decrypt(row.encrypted_cache.encode()).decode(), cache.serialize())

    @patch("communications.microsoft_email.application")
    def test_undecryptable_cache_fails_before_network(self, application):
        row = self.credential()
        row.encrypted_cache = "invalid"
        row.save()
        with self.assertRaises(MicrosoftEmailUnavailable):
            access_token()
        application.assert_not_called()

    @patch("communications.microsoft_email.application")
    def test_successful_refresh_saves_encrypted_cache_for_the_next_worker(self, application):
        row = self.credential()
        previous = row.encrypted_cache
        app = Mock()
        app.get_accounts.return_value = [{"username": MAILBOX}]

        def build(cache):
            def refresh(*args, **kwargs):
                cache.deserialize('{"AccessToken":{"test":{"secret":"private-renewed-value"}}}')
                cache.has_state_changed = True
                return {"access_token": "test-access-token"}
            app.acquire_token_silent.side_effect = refresh
            return app
        application.side_effect = build
        self.assertEqual(access_token(), "test-access-token")
        row.refresh_from_db()
        self.assertEqual(row.revision, 1)
        self.assertNotEqual(row.encrypted_cache, previous)
        self.assertNotIn("private-renewed-value", row.encrypted_cache)
        self.assertIn("private-renewed-value", self.cipher.decrypt(row.encrypted_cache.encode()).decode())

    @patch("communications.microsoft_email.application")
    def test_renewed_cache_is_persisted_without_overwriting_concurrent_refresh(self, application):
        row = self.credential()
        winner = self.cipher.encrypt(b'{"Account":{}}').decode()
        app = Mock()
        app.get_accounts.return_value = [{"username": MAILBOX}]

        def build(cache):
            def refresh(*args, **kwargs):
                MicrosoftMailCredential.objects.filter(pk=row.pk).update(encrypted_cache=winner, revision=1)
                cache.has_state_changed = True
                return {"access_token": "test-access-token"}
            app.acquire_token_silent.side_effect = refresh
            return app
        application.side_effect = build
        self.assertEqual(access_token(), "test-access-token")
        row.refresh_from_db()
        self.assertEqual(row.encrypted_cache, winner)
        self.assertEqual(row.revision, 1)

    @patch("communications.microsoft_email.application")
    def test_missing_refresh_authorization_requires_owner_sign_in(self, application):
        self.credential()
        application.return_value.get_accounts.return_value = [{"username": MAILBOX}]
        application.return_value.acquire_token_silent.return_value = None
        with self.assertRaises(MicrosoftEmailUnavailable):
            access_token()

    @patch("communications.microsoft_email.access_token", side_effect=MicrosoftEmailUnavailable("pending"))
    def test_retry_does_not_consume_attempts_without_authorization(self, token):
        row = EmailDelivery.objects.create(subject="Queued", body="Pending", recipients=["client@example.test"])
        with self.assertRaises(MicrosoftEmailUnavailable):
            call_command("retry_emails")
        row.refresh_from_db()
        self.assertEqual(row.attempts, 0)
        self.assertIsNone(row.sent_at)

    @patch("api.management.commands.retry_emails.deliver_email")
    @patch("communications.microsoft_email.access_token", return_value="test-token")
    def test_retry_can_preserve_a_setup_message_without_sending_or_deleting_it(self, token, deliver):
        held = EmailDelivery.objects.create(subject="Setup", body="Pending", recipients=["qa@example.test"])
        active = EmailDelivery.objects.create(subject="Queued", body="Pending", recipients=["client@example.test"])
        call_command("retry_emails", "--exclude", str(held.pk))
        deliver.assert_called_once_with(active.pk)
        held.refresh_from_db()
        self.assertEqual(held.attempts, 0)
        self.assertIsNone(held.sent_at)

    @override_settings(DJANGO_ENV="production", EMAIL_PROVIDER="console")
    def test_production_console_cannot_mark_email_as_sent(self):
        row = EmailDelivery.objects.create(subject="Queued", body="Pending", recipients=["client@example.test"])
        deliver_email(row.pk)
        row.refresh_from_db()
        self.assertEqual(row.attempts, 0)
        self.assertIsNone(row.sent_at)
        self.assertEqual(row.last_error, "EmailProviderNotConfigured")

    @patch("communications.microsoft_email.access_token", return_value="test-token")
    @patch("communications.microsoft_email.requests.post")
    def test_outbox_only_records_acceptance_on_202(self, post, token):
        post.return_value.status_code = 429
        row = EmailDelivery.objects.create(subject="Queued", body="Pending", recipients=["client@example.test"])
        deliver_email(row.pk)
        row.refresh_from_db()
        self.assertIsNone(row.sent_at)
        self.assertEqual(row.attempts, 1)
        post.return_value.status_code = 202
        deliver_email(row.pk)
        row.refresh_from_db()
        self.assertIsNotNone(row.sent_at)
        self.assertEqual(row.attempts, 2)

    @patch("api.notifications.EmailMessage.send", return_value=0)
    def test_outbox_does_not_mark_a_zero_delivery_count_as_sent(self, send):
        row = EmailDelivery.objects.create(subject="Queued", body="Pending", recipients=["client@example.test"])
        deliver_email(row.pk)
        row.refresh_from_db()
        self.assertIsNone(row.sent_at)
        self.assertEqual(row.last_error, "RuntimeError")
