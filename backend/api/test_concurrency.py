"""Run on a disposable PostgreSQL test DB to exercise row locks across workers."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import time, timedelta
from threading import Barrier
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.db import close_old_connections
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from assets.models import Asset
from projects.models import Project
from scheduling.models import Appointment, AvailabilityRule
from scheduling.services import save_appointment, BookingConflict


@skipUnlessDBFeature('has_select_for_update')
class ConcurrentRequestTests(TransactionTestCase):
    def parallel(self, operation):
        barrier = Barrier(2)
        def worker():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return operation()
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(worker) for _ in range(2)]
            return sorted(future.result(timeout=15) for future in futures)

    def test_two_workers_cannot_book_the_same_time(self):
        start = (timezone.now().astimezone(ZoneInfo('America/New_York')) + timedelta(days=2)).replace(hour=12, minute=0, second=0, microsecond=0)
        AvailabilityRule.objects.create(weekday=start.weekday(), start_time=time(10), end_time=time(16))
        def book():
            try:
                save_appointment(dict(first_name='QA', last_name='Client', email='qa@example.test',
                    starts_at=start, idempotency_key=str(uuid.uuid4())))
                return 201
            except BookingConflict:
                return 409
        self.assertEqual(self.parallel(book), [201, 409])
        self.assertEqual(Appointment.objects.count(), 1)

    @patch('api.uploads.signed_upload_url', return_value='https://storage.example.test/put')
    def test_two_workers_cannot_reserve_a_thirteenth_file(self, _):
        user = User.objects.create_user('qa@example.test', 'long-test-password')
        project = Project.objects.create(client=user, name='Concurrent uploads')
        for _ in range(11):
            Asset.objects.create(project=project, group='project', object_name=str(uuid.uuid4()),
                original_name='qa.pdf', content_type='application/pdf', size=100, uploaded=True)
        def reserve():
            api = APIClient(); api.force_authenticate(user)
            return api.post('/api/v1/assets/prepare/', dict(project=str(project.pk), group='project',
                name='qa.pdf', content_type='application/pdf', size=100, request_key=str(uuid.uuid4())), format='json').status_code
        self.assertEqual(self.parallel(reserve), [201, 400])
        self.assertEqual(Asset.objects.count(), 12)
