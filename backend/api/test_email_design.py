import base64
from datetime import time, timedelta
from email import policy
from email.parser import BytesParser
from unittest.mock import patch

from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.test import TestCase, override_settings
from django.utils import timezone

from api.confirmations import prepare_brief_confirmation
from api.notifications import deliver_email, queue_email
from communications.email_design import branded_email
from communications.microsoft_email import EmailBackend
from communications.models import EmailDelivery
from intakes.models import ProjectBrief
from scheduling.models import AvailabilityRule
from scheduling.services import EASTERN, save_appointment


@override_settings(FRONTEND_URL="https://marcdbycartez.com", DEFAULT_FROM_EMAIL="Cartez Dewberry <letsbuild@marcdbycartez.com>")
class EmailDesignTests(TestCase):
    def test_layout_escapes_customer_content_and_restricts_action_urls(self):
        html = branded_email("A project update", greeting='<img src=x onerror="alert(1)">',
            details=[("Notes", "<script>bad()</script>")],
            action=("Confirm email", "https://marcdbycartez.com/confirm?kind=brief&id=123#token=private"))
        self.assertNotIn("<script>", html)
        self.assertNotIn("<img", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("#token=private", html)
        self.assertIn("C<span", html)
        self.assertIn("Arial,Helvetica,sans-serif", html)
        self.assertIn('href="mailto:letsbuild@marcdbycartez.com"', html)
        self.assertIn("Questions? Reply to this email.", html)
        for url in ("javascript:alert(1)", "https://untrusted.example/confirm"):
            with self.assertRaises(ValueError):
                branded_email("Update", action=("Open", url))

    def test_outbox_stores_both_versions_and_retry_keeps_exact_html(self):
        html = branded_email("Your brief is saved.", paragraphs=["Confirm your email."])
        with self.captureOnCommitCallbacks(execute=True):
            queue_email("Brief received", "Plain-text receipt", ["client@example.test"], html=html)
        row = EmailDelivery.objects.get()
        self.assertEqual(row.html_body, html)
        self.assertEqual(mail.outbox[0].body, "Plain-text receipt")
        self.assertEqual(mail.outbox[0].alternatives[0].content, html)
        self.assertEqual(mail.outbox[0].reply_to, ["Cartez Dewberry <letsbuild@marcdbycartez.com>"])
        deliver_email(row.pk)
        self.assertEqual(len(mail.outbox), 1)

    def test_client_brief_is_shorter_while_owner_receives_all_answers(self):
        response = self.client.post("/api/v1/public/briefs/", {
            "name": "Jordan", "email": "jordan@example.test", "overview": "A detailed project idea",
            "notes": "Keep these detailed notes for the owner", "idempotency_key": "email-design",
        }, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        client = EmailDelivery.objects.get(recipients=["jordan@example.test"])
        owner = EmailDelivery.objects.exclude(pk=client.pk).get()
        self.assertIn("Confirm email", client.html_body)
        self.assertIn("48 hours", client.html_body)
        self.assertNotIn("A detailed project idea", client.html_body)
        self.assertIn("A detailed project idea", owner.html_body)
        self.assertIn("Keep these detailed notes for the owner", owner.html_body)
        self.assertIn("Review brief &amp; files", owner.html_body)

    def test_pending_booking_has_confirmation_action_and_no_calendar_attachment(self):
        start = (timezone.now().astimezone(EASTERN) + timedelta(days=3)).replace(hour=12, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(weekday=start.weekday(), start_time=time(10), end_time=time(16))
        save_appointment(dict(first_name="Jordan", last_name="Client", email="jordan@example.test",
                              starts_at=start, idempotency_key="email-booking"))
        client = EmailDelivery.objects.get(recipients=["jordan@example.test"])
        self.assertIn("Confirm appointment", client.html_body)
        self.assertIn("Manage your request", client.html_body)
        self.assertIn("Eastern time", client.html_body)
        self.assertIn("Confirm by", client.html_body)
        self.assertEqual(client.calendar, "")

    @override_settings(MICROSOFT_MAILBOX="owner@example.test")
    @patch("communications.microsoft_email.access_token", return_value="test-token")
    @patch("communications.microsoft_email.requests.post")
    def test_graph_mime_preserves_html_plain_text_calendar_and_recipients(self, post, token):
        post.return_value.status_code = 202
        message = EmailMultiAlternatives("Your consultation", "Plain confirmation", "Owner <owner@example.test>",
                                        ["client@example.test"], bcc=["audit@example.test"], reply_to=["owner@example.test"])
        message.attach_alternative(branded_email("You’re booked."), "text/html")
        message.attach("consultation.ics", "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n", "text/calendar")
        self.assertEqual(EmailBackend().send_messages([message]), 1)
        options = post.call_args.kwargs
        self.assertNotIn("json", options)
        self.assertEqual(options["headers"]["Content-Type"], "text/plain")
        mime = BytesParser(policy=policy.default).parsebytes(base64.b64decode(options["data"]))
        self.assertEqual(mime["To"], "client@example.test")
        self.assertEqual(mime["Bcc"], "audit@example.test")
        self.assertEqual(mime["Reply-To"], "owner@example.test")
        self.assertEqual(mime.get_body(preferencelist=("plain",)).get_content(), "Plain confirmation")
        self.assertIn("C<span", mime.get_body(preferencelist=("html",)).get_content())
        attachments = list(mime.iter_attachments())
        self.assertEqual(attachments[0].get_filename(), "consultation.ics")
        self.assertIn("BEGIN:VCALENDAR", attachments[0].get_content())
