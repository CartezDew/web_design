"""Security, retry, quota, and calendar regressions; external providers are mocked."""
import uuid
from datetime import datetime, time, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import TestCase, RequestFactory, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, Invitation
from assets.models import Asset
from communications.models import EmailDelivery
from intakes.models import ProjectBrief
from projects.models import Project
from scheduling.models import Appointment, AvailabilityRule, AvailabilityOverride
from scheduling.services import available_starts, calendar_text, save_appointment, BookingConflict, EASTERN
from api.notifications import queue_email, deliver_email
from api.tokens import issue_token
from api.client_address import client_ip
from api.storage import signed_upload_url


class UploadWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('owner@example.test', 'long-test-password')
        self.other = User.objects.create_user('other@example.test', 'long-test-password')
        self.brief = ProjectBrief.objects.create(name='Client', email=self.user.email,
            overview='Website project', idempotency_key=str(uuid.uuid4()), client=self.user)
        self.project = Project.objects.create(name='Website', brief=self.brief, client=self.user)
        self.token = issue_token('upload', self.brief.pk)
        self.api = APIClient()

    def prepare(self, **overrides):
        data = dict(brief=str(self.brief.pk), upload_token=self.token, group='inspiration',
            name='reference.pdf', content_type='application/pdf', size=100, request_key=str(uuid.uuid4()))
        data.update(overrides)
        return self.api.post('/api/v1/assets/prepare/', data, format='json')

    def asset(self, size=100, **kwargs):
        return Asset.objects.create(project=self.project, original_name='asset.pdf',
            object_name=str(uuid.uuid4()), content_type='application/pdf', group='project',
            size=size, uploaded=True, **kwargs)

    @patch('api.uploads.signed_upload_url', return_value='https://storage.example.test/put')
    def test_quota_is_shared_across_brief_and_project_and_retry_does_not_count_twice(self, _):
        for _ in range(11):
            self.asset()
        key = str(uuid.uuid4())
        first = self.prepare(request_key=key)
        retry = self.prepare(request_key=key)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(first.data['asset']['id'], retry.data['asset']['id'])
        self.assertEqual(self.prepare().status_code, 400)
        release = self.api.post(f"/api/v1/assets/{first.data['asset']['id']}/release/",
            {'upload_token': self.token}, format='json')
        self.assertEqual(release.status_code, 204)
        self.assertEqual(self.prepare().status_code, 201)

    @patch('api.uploads.signed_upload_url', return_value='https://storage.example.test/put')
    def test_combined_bytes_and_per_file_boundaries(self, _):
        for _ in range(4):
            self.asset(size=5 * 1024 * 1024)
        self.assertEqual(self.prepare(size=5 * 1024 * 1024).status_code, 201)
        self.assertEqual(self.prepare(size=1).status_code, 400)
        self.assertEqual(self.prepare(size=5 * 1024 * 1024 + 1).status_code, 400)

    def test_forged_token_and_cross_client_upload_are_denied(self):
        self.assertEqual(self.prepare(upload_token='forged').status_code, 403)
        self.api.force_authenticate(self.other)
        self.assertEqual(self.prepare(brief=None, project=str(self.project.pk), group='project').status_code, 403)

    @patch('api.storage.bucket')
    def test_signed_upload_binds_exact_size(self, storage):
        asset = self.asset(size=1024)
        signed_upload_url(asset)
        options = storage.return_value.blob.return_value.generate_signed_url.call_args.kwargs
        self.assertEqual(options['headers'], {'Content-Length': '1024'})

    def test_invalid_project_identifier_is_rejected(self):
        self.api.force_authenticate(self.user)
        self.assertEqual(self.prepare(brief=None, project='invalid', group='project').status_code, 400)

    @patch('api.uploads.signed_upload_url', side_effect=RuntimeError('provider unavailable'))
    def test_storage_failure_does_not_consume_quota(self, _):
        self.assertEqual(self.prepare().status_code, 400)
        self.assertEqual(Asset.objects.count(), 0)

    @patch('api.uploads.validate_uploaded_blob', return_value=(False, 'Invalid file content.'))
    def test_invalid_content_is_not_downloadable(self, _):
        asset = Asset.objects.create(brief=self.brief, original_name='bad.png', object_name='pending/bad',
            size=100, content_type='image/png', group='inspiration')
        result = self.api.post(f'/api/v1/assets/{asset.pk}/finalize/', {'upload_token': self.token}, format='json')
        self.assertEqual(result.status_code, 400)
        asset.refresh_from_db()
        self.assertFalse(asset.uploaded)
        self.assertIsNotNone(asset.deleted_at)


class CalendarWorkflowTests(TestCase):
    def setUp(self):
        self.eastern = ZoneInfo('America/New_York')
        self.start = (timezone.now().astimezone(self.eastern) + timedelta(days=3)).replace(hour=11, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(weekday=self.start.weekday(), start_time=time(10), end_time=time(13))

    def booking(self, **kwargs):
        values = dict(first_name='Alex', last_name='Client', email='client@example.test',
            starts_at=self.start, idempotency_key=str(uuid.uuid4()))
        values.update(kwargs)
        return save_appointment(values)

    def test_overlap_is_rejected_and_cancellation_releases_time(self):
        appointment = self.booking()
        self.assertNotIn(self.start, available_starts(self.start.date()))
        with self.assertRaises(BookingConflict):
            self.booking(starts_at=self.start + timedelta(minutes=15))
        save_appointment({'status': 'cancelled'}, appointment)
        self.assertIn(self.start, available_starts(self.start.date()))

    def test_rescheduling_keeps_old_slot_when_new_slot_is_taken(self):
        first = self.booking()
        second = self.booking(starts_at=self.start + timedelta(minutes=30))
        with self.assertRaises(BookingConflict):
            save_appointment({'starts_at': second.starts_at}, first)
        first.refresh_from_db()
        self.assertEqual(first.starts_at, self.start)

    def test_blocked_dates_horizon_and_calendar_download(self):
        appointment = self.booking()
        AvailabilityOverride.objects.create(date=self.start.date(), is_blocked=True)
        self.assertEqual(available_starts(self.start.date()), [])
        self.assertEqual(available_starts(self.start.date() + timedelta(days=90)), [])
        calendar = calendar_text(appointment)
        self.assertIn('STATUS:TENTATIVE', calendar)
        self.assertIn('Scheduled in Eastern time (EST/EDT)', calendar)
        self.assertIn(appointment.starts_at.astimezone(EASTERN).strftime('%I:%M %p %Z'), calendar)
        self.assertIn(f'UID:{appointment.pk}', calendar)
        self.assertIn('\r\n', calendar)

    def test_authenticated_public_booking_belongs_to_verified_session(self):
        owner = User.objects.create_user('client@example.test', 'long-test-password')
        api = APIClient(); api.force_authenticate(owner)
        response = api.post('/api/v1/public/appointments/', dict(first_name='Alex', last_name='Client',
            email='spoofed@example.test', starts_at=self.start.isoformat(), idempotency_key=str(uuid.uuid4())), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        appointment = Appointment.objects.get(pk=response.data['id'])
        self.assertEqual(appointment.client, owner)
        self.assertEqual(appointment.email, owner.email)

    def test_guest_management_requires_scoped_token(self):
        appointment = self.booking()
        url = f'/api/v1/public/appointments/{appointment.pk}/manage/'
        self.assertEqual(self.client.get(url).status_code, 403)
        token = issue_token('appointment', appointment.pk)
        self.assertEqual(self.client.get(url, {'token': token}).status_code, 200)
        self.assertEqual(self.client.get(url, {'token': issue_token('upload', appointment.pk)}).status_code, 403)
        cancelled = self.client.post(url, {'token': token, 'action': 'cancel'}, content_type='application/json')
        self.assertEqual(cancelled.status_code, 200)

    @patch('scheduling.services.timezone.now', return_value=datetime(2027, 3, 1, tzinfo=ZoneInfo('UTC')))
    def test_nonexistent_spring_dst_times_are_not_offered(self, _):
        AvailabilityRule.objects.all().delete()
        AvailabilityRule.objects.create(weekday=6, start_time=time(1), end_time=time(4))
        slots = available_starts(datetime(2027, 3, 14).date())
        self.assertEqual([slot.astimezone(self.eastern).hour for slot in slots], [1, 1, 3, 3])


class AccountAndDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('client@example.test', 'long-test-password')

    def test_login_requires_csrf_before_creating_session(self):
        api = APIClient(enforce_csrf_checks=True)
        payload = {'email': self.user.email, 'password': 'long-test-password'}
        self.assertEqual(api.post('/api/v1/auth/session/', payload, format='json').status_code, 403)
        token = api.get('/api/v1/auth/csrf/').data['csrfToken']
        self.assertEqual(api.post('/api/v1/auth/session/', payload, format='json', HTTP_X_CSRFTOKEN=token).status_code, 200)

    def test_profile_cannot_escalate_role_or_change_email(self):
        api = APIClient(); api.force_authenticate(self.user)
        self.assertEqual(api.patch('/api/v1/auth/profile/', {'role': 'admin'}, format='json').status_code, 400)
        self.assertEqual(api.patch('/api/v1/auth/profile/', {'first_name': 'Updated'}, format='json').status_code, 200)
        self.user.refresh_from_db(); self.assertEqual(self.user.role, 'client')

    def test_forwarded_ip_is_not_trusted_by_default(self):
        request = RequestFactory().get('/', REMOTE_ADDR='127.0.0.1', HTTP_X_FORWARDED_FOR='1.2.3.4', HTTP_X_REAL_IP='5.6.7.8')
        self.assertEqual(client_ip(request), '127.0.0.1')
        with override_settings(TRUST_RAILWAY_PROXY=True):
            self.assertEqual(client_ip(request), '5.6.7.8')

    def test_client_invitation_cannot_activate_an_inactive_admin(self):
        admin = User.objects.create_superuser('admin@example.test', 'long-admin-password')
        inactive = User.objects.create_superuser('inactive@example.test', 'long-admin-password', is_active=False)
        project = Project.objects.create(name='Project', client=self.user)
        invitation, token = Invitation.issue(email=inactive.email, invited_by=admin, project=project)
        response = self.client.post('/api/v1/auth/invitations/accept/', dict(token=token, first_name='QA', last_name='User', password='long-new-password-548!'), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        inactive.refresh_from_db(); self.assertFalse(inactive.is_active)

    def test_login_is_rate_limited(self):
        for _ in range(10):
            self.client.post('/api/v1/auth/session/', {'email': self.user.email, 'password': 'wrong'})
        response = self.client.post('/api/v1/auth/session/', {'email': self.user.email, 'password': 'wrong'})
        self.assertEqual(response.status_code, 429)

    def test_invalid_reset_identifier_is_a_validation_error(self):
        response = self.client.post('/api/v1/auth/password-reset/confirm/', {'uid': 'bm90LWEtdXVpZA', 'token': 'bad', 'password': 'long-test-password'})
        self.assertEqual(response.status_code, 400)

    @patch('api.notifications.EmailMultiAlternatives.send', side_effect=RuntimeError('provider unavailable'))
    def test_email_failure_keeps_retryable_outbox(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            queue_email('Saved request', 'Thanks', ['client@example.test'])
        delivery = EmailDelivery.objects.get()
        self.assertIsNone(delivery.sent_at)
        self.assertEqual(delivery.attempts, 1)
        send.side_effect = None; send.return_value = 1
        deliver_email(delivery.pk); deliver_email(delivery.pk)
        delivery.refresh_from_db()
        self.assertIsNotNone(delivery.sent_at)
        self.assertEqual(send.call_count, 2)
