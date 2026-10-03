from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch
import json

import requests
from django.core.cache import cache
from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from api.analytics_preferences import ACTION, preference_summary, report_preference_totals
from audit.models import AuditEvent

URL = '/api/v1/public/analytics-preference/'


class PreferenceTests(TestCase):
    def setUp(self):
        cache.clear()

    def post(self, data):
        return self.client.post(URL, data, content_type='application/json', REMOTE_ADDR='203.0.113.18')

    def test_anonymous_daily_totals_do_not_store_the_actor_ip_or_visitor_id(self):
        owner = User.objects.create_user('owner@example.test', 'test', role='admin')
        self.client.force_login(owner)
        for signal in ['unknown', 'reported', 'unknown']:
            self.assertEqual(self.post({'automation_signal': signal}).status_code, 204)
        row = AuditEvent.objects.get(action=ACTION)
        self.assertIsNone(row.actor_id)
        self.assertIsNone(row.ip_address)
        self.assertEqual(row.metadata, {'opt_out_total': 3, 'automation_reported': 1, 'unclassified': 2})
        self.assertEqual(row.object_id, timezone.now().date().isoformat())
        self.assertNotIn('203.0.113', json.dumps(row.metadata))
        self.assertEqual(preference_summary(30)['unit'], 'off_choices')

    def test_rejects_identifying_fields_and_invented_human_ai_classifications(self):
        for data in [{}, [], {'automation_signal': 'human'}, {'automation_signal': 'ai'},
                     {'automation_signal': 'unknown', 'email': 'private@example.test'},
                     {'automation_signal': 'reported', 'client_id': '123.456'}]:
            self.assertEqual(self.post(data).status_code, 400)
        self.assertFalse(AuditEvent.objects.filter(action=ACTION).exists())

    def test_csrf_is_required_and_valid_session_works(self):
        api = APIClient(enforce_csrf_checks=True)
        self.assertEqual(api.post(URL, {'automation_signal': 'unknown'}, format='json').status_code, 403)
        token = api.get('/api/v1/auth/csrf/').json()['csrfToken']
        self.assertEqual(api.post(URL, {'automation_signal': 'unknown'}, format='json', HTTP_X_CSRFTOKEN=token).status_code, 204)

    def test_rate_limit_bounds_counter_spam(self):
        for _ in range(30):
            self.assertEqual(self.post({'automation_signal': 'reported'}).status_code, 204)
        self.assertEqual(self.post({'automation_signal': 'reported'}).status_code, 429)
        self.assertEqual(AuditEvent.objects.get(action=ACTION).metadata['opt_out_total'], 30)

    def test_summary_is_available_only_in_admin_insights(self):
        self.post({'automation_signal': 'unknown'})
        api = APIClient()
        self.assertEqual(api.get('/api/v1/admin/insights/').status_code, 403)
        client = User.objects.create_user('client@example.test', 'test')
        api.force_authenticate(client)
        self.assertEqual(api.get('/api/v1/admin/insights/').status_code, 403)
        client.role = 'admin'
        client.save(update_fields=['role'])
        data = api.get('/api/v1/admin/insights/').json()
        self.assertEqual(data['privacy_choices']['opt_out_total'], 1)
        self.assertEqual(data['privacy_choices']['classification'], 'signals_only')


@override_settings(GA_MEASUREMENT_ID='G-TEST12345', GA_API_SECRET='secret-test-only')
class ReportingTests(TestCase):
    def row(self, ago=1):
        day = (timezone.now().date() - timedelta(days=ago)).isoformat()
        return AuditEvent.objects.create(action=ACTION, object_type='daily_statistics', object_id=day,
            metadata={'opt_out_total': 7, 'automation_reported': 2, 'unclassified': 5})

    @patch('api.analytics_preferences.requests.post')
    def test_completed_daily_totals_send_once_using_only_service_identity(self, send):
        send.return_value.status_code = 204
        yesterday, today = self.row(), self.row(0)
        self.assertEqual(report_preference_totals(), 1)
        self.assertEqual(report_preference_totals(), 0)
        send.assert_called_once()
        payload = send.call_args.kwargs['json']
        self.assertEqual(payload['client_id'], '1.1')
        self.assertEqual([event['params']['value'] for event in payload['events']], [7, 2, 5])
        self.assertEqual(payload['events'][0]['name'], 'analytics_opt_out_total')
        self.assertNotIn('session_id', json.dumps(payload))
        self.assertNotIn('user_id', json.dumps(payload))
        today.refresh_from_db()
        self.assertNotIn('google_status', today.metadata)
        yesterday.refresh_from_db()
        self.assertEqual(yesterday.metadata['google_status'], 'accepted')

    @patch('api.analytics_preferences.requests.post', side_effect=requests.Timeout('secret URL'))
    def test_ambiguous_delivery_is_not_retried_or_logged_with_secrets(self, send):
        row = self.row()
        with self.assertLogs('api.analytics_preferences', level='WARNING') as logs:
            self.assertEqual(report_preference_totals(), 0)
        report_preference_totals()
        send.assert_called_once()
        self.assertNotIn('secret URL', ''.join(logs.output))
        row.refresh_from_db()
        self.assertEqual(row.metadata['google_status'], 'uncertain')
        self.assertEqual(preference_summary(30)['opt_out_total'], 7)

    @patch('api.analytics_preferences.requests.post')
    def test_old_totals_stay_local_and_disabled_reporting_never_sends(self, send):
        row = self.row(4)
        self.assertEqual(report_preference_totals(), 0)
        row.refresh_from_db()
        self.assertEqual(row.metadata['google_status'], 'too_old')
        self.row()
        with override_settings(GA_API_SECRET=''):
            self.assertEqual(report_preference_totals(), 0)
        send.assert_not_called()


class ConcurrentPreferenceTests(TransactionTestCase):
    def test_simultaneous_first_choices_are_not_lost(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Production row locking requires PostgreSQL')
        cache.clear()
        def choose(index):
            close_old_connections()
            try:
                return APIClient().post(URL, {'automation_signal': 'unknown'}, format='json',
                                        REMOTE_ADDR=f'203.0.113.{index + 1}').status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(list(pool.map(choose, range(8))), [204] * 8)
        row = AuditEvent.objects.get(action=ACTION)
        self.assertEqual(row.metadata['opt_out_total'], 8)
