from datetime import time, timedelta
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from communications.models import EmailDelivery
from intakes.models import ProjectBrief
from scheduling.models import Appointment, AvailabilityRule
from scheduling.services import EASTERN, available_starts, expire_pending_appointments, save_appointment
from api.confirmations import confirmation_link, prepare_brief_confirmation
from api.tokens import issue_token


class SubmissionConfirmationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('owner@example.test', 'test-password', role='admin')
        self.admin_api = APIClient(); self.admin_api.force_authenticate(self.admin)
        self.start = (timezone.now().astimezone(EASTERN) + timedelta(days=2)).replace(hour=12, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(weekday=self.start.weekday(), start_time=time(10), end_time=time(16))

    def booking(self, key='request'):
        return save_appointment(dict(first_name='Alex', last_name='Client', email='alex@example.test',
                                     starts_at=self.start, idempotency_key=key))

    def payload(self, kind, record):
        link = urlsplit(confirmation_link(kind, record))
        values = {key: value[0] for key, value in parse_qs(link.query).items()}
        values.update({key: value[0] for key, value in parse_qs(link.fragment).items()})
        return values

    def confirm(self, payload):
        return self.client.post('/api/v1/public/confirm/', payload, content_type='application/json')

    def preview(self, payload):
        return self.client.get('/api/v1/public/confirm/', {key:value for key,value in payload.items() if key != 'token'},
                               HTTP_AUTHORIZATION='Bearer '+payload['token'])

    def test_customer_and_owner_receive_request_before_verification(self):
        appointment = self.booking()
        self.assertEqual(appointment.status, 'pending')
        self.assertIsNone(appointment.email_verified_at)
        client = EmailDelivery.objects.get(recipients=['alex@example.test'])
        self.assertIn('Confirm appointment', client.body)
        self.assertIn('Eastern time', client.body)
        self.assertEqual(client.calendar, '')
        owner = EmailDelivery.objects.exclude(pk=client.pk).get()
        self.assertIn('alex@example.test', owner.body)
        self.assertIn('Alex Client', owner.body)
        self.assertIn('awaiting customer confirmation', owner.subject)
        self.assertNotIn('token', owner.body)
        self.assertNotIn('confirmation_nonce', self.admin_api.get(f'/api/v1/appointments/{appointment.pk}/').data)

    def test_read_does_not_confirm_and_double_post_sends_only_one_receipt(self):
        appointment = self.booking()
        payload = self.payload('appointment', appointment)
        response = self.preview(payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/v1/public/confirm/', payload).status_code, 403)
        appointment.refresh_from_db(); self.assertIsNone(appointment.email_verified_at)
        self.assertEqual(appointment.status, 'pending')
        self.assertEqual(self.confirm(payload).status_code, 200)
        self.assertEqual(self.confirm(payload).status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, 'confirmed')
        self.assertIsNotNone(appointment.email_verified_at)
        self.assertEqual(EmailDelivery.objects.count(), 4)
        receipt = EmailDelivery.objects.filter(recipients=['alex@example.test']).exclude(calendar='').get()
        self.assertIn('STATUS:CONFIRMED', receipt.calendar)
        self.assertIn('appointment is booked', receipt.body)

    def test_manage_and_upload_tokens_cannot_verify(self):
        appointment = self.booking()
        payload = self.payload('appointment', appointment)
        for kind in ['appointment', 'upload']:
            payload['token'] = issue_token(kind, appointment.pk)
            self.assertEqual(self.confirm(payload).status_code, 403)
        self.assertEqual(self.confirm(dict(kind='appointment', id='invalid', token='bad')).status_code, 400)
        appointment.refresh_from_db(); self.assertIsNone(appointment.email_verified_at)

    def test_expiry_releases_slot_without_deleting_request_or_late_booking(self):
        appointment = self.booking()
        payload = self.payload('appointment', appointment)
        Appointment.objects.filter(pk=appointment.pk).update(confirmation_expires_at=timezone.now() - timedelta(seconds=1))
        self.assertIn(self.start, available_starts(self.start.date()))
        self.assertEqual(self.confirm(payload).status_code, 400)
        replacement = self.booking('replacement')
        appointment.refresh_from_db(); self.assertEqual(appointment.status, 'expired')
        self.assertEqual(Appointment.objects.count(), 2)
        self.assertEqual(replacement.status, 'pending')
        self.assertEqual(expire_pending_appointments(), 0)
        self.assertEqual(self.confirm(payload).status_code, 400)

    def test_cancellation_and_rescheduling_invalidate_old_confirmation(self):
        appointment = self.booking()
        old = self.payload('appointment', appointment)
        save_appointment({'status': 'cancelled'}, appointment)
        self.assertEqual(self.confirm(old).status_code, 400)
        appointment = save_appointment({'status': 'pending', 'starts_at': self.start + timedelta(minutes=30)}, appointment)
        self.assertEqual(self.confirm(old).status_code, 403)
        self.assertEqual(self.confirm(self.payload('appointment', appointment)).status_code, 200)
        appointment = save_appointment({'status': 'pending', 'starts_at': self.start + timedelta(minutes=60)}, appointment)
        self.assertIsNone(appointment.email_verified_at)
        self.assertEqual(appointment.status, 'pending')

    def test_admin_cannot_confirm_before_customer_and_calendar_is_gated(self):
        appointment = self.booking()
        self.assertEqual(self.admin_api.patch(f'/api/v1/appointments/{appointment.pk}/', {'status':'confirmed'}, format='json').status_code, 400)
        self.assertEqual(self.admin_api.get(f'/api/v1/appointments/{appointment.pk}/calendar/').status_code, 400)
        self.assertEqual(self.client.get(f'/api/v1/public/appointments/{appointment.pk}/manage/',
                         {'token': issue_token('appointment', appointment.pk), 'download':'calendar'}).status_code, 400)
        self.assertEqual(self.confirm(self.payload('appointment', appointment)).status_code, 200)
        self.assertEqual(self.admin_api.get(f'/api/v1/appointments/{appointment.pk}/calendar/').status_code, 200)

    def test_brief_contents_saved_owner_notified_and_project_gated(self):
        data = dict(name='Alex Client', email='alex@example.test', phone='404-555-0123', overview='Bookings and a polished portfolio',
                    inspiration_link='https://example.test/design', idempotency_key='brief')
        response = self.client.post('/api/v1/public/briefs/', data, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('confirm', str(response.data))
        brief = ProjectBrief.objects.get()
        self.assertIsNone(brief.email_verified_at)
        owner = EmailDelivery.objects.exclude(recipients=['alex@example.test']).get()
        self.assertIn(data['overview'], owner.body); self.assertIn(data['phone'], owner.body)
        self.assertIn(data['inspiration_link'], owner.body)
        self.assertEqual(self.admin_api.post(f'/api/v1/admin/briefs/{brief.pk}/invite/', {}, format='json').status_code, 400)
        payload = self.payload('brief', brief)
        self.assertEqual(self.preview(payload).status_code, 200)
        brief.refresh_from_db(); self.assertIsNone(brief.email_verified_at)
        self.assertEqual(self.confirm(payload).status_code, 200)
        brief.refresh_from_db(); self.assertIsNotNone(brief.email_verified_at)
        self.assertEqual(brief.status, 'new')
        self.assertEqual(self.admin_api.post(f'/api/v1/admin/briefs/{brief.pk}/invite/', {}, format='json').status_code, 200)

    def test_expired_brief_resend_rotates_link_without_losing_contents(self):
        brief = ProjectBrief.objects.create(name='Alex', email='alex@example.test', overview='Keep my information', idempotency_key='resend')
        prepare_brief_confirmation(brief)
        old = self.payload('brief', brief)
        self.assertEqual(self.admin_api.post(f'/api/v1/admin/briefs/{brief.pk}/resend-confirmation/', {}, format='json').status_code, 400)
        ProjectBrief.objects.filter(pk=brief.pk).update(confirmation_expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.confirm(old).status_code, 400)
        self.assertEqual(self.admin_api.post(f'/api/v1/admin/briefs/{brief.pk}/resend-confirmation/', {}, format='json').status_code, 200)
        brief.refresh_from_db()
        self.assertEqual(brief.overview, 'Keep my information')
        self.assertEqual(self.confirm(old).status_code, 403)
        self.assertEqual(self.confirm(self.payload('brief', brief)).status_code, 200)

    def test_confirmation_requires_csrf_and_does_not_accept_client_supplied_verification(self):
        appointment = self.booking()
        csrf_api = APIClient(enforce_csrf_checks=True)
        self.assertEqual(csrf_api.post('/api/v1/public/confirm/', self.payload('appointment', appointment), format='json').status_code, 403)
        response = self.admin_api.patch(f'/api/v1/appointments/{appointment.pk}/',
                                        {'email_verified_at':timezone.now().isoformat(), 'status':'confirmed'}, format='json')
        self.assertEqual(response.status_code, 400)
