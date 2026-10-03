"""Anonymous daily preference counters, with no visitor-level records or identifiers."""
from datetime import datetime, time, timedelta, timezone as dt_timezone
import hashlib
import logging
import uuid

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from api.client_address import client_ip
from audit.models import AuditEvent

ACTION = 'analytics.preferences.daily'
COUNTERS = ('opt_out_total', 'automation_reported', 'unclassified')
logger = logging.getLogger(__name__)


class PreferenceThrottle(SimpleRateThrottle):
    # A short-lived abuse limit; no IP is saved in preference statistics.
    rate = '30/hour'
    scope = 'analytics_preference'

    def get_cache_key(self, request, view):
        date = timezone.now().date().isoformat()
        address = client_ip(request) or 'unknown'
        digest = hashlib.sha256(f'{date}:{address}:{settings.SECRET_KEY}'.encode()).hexdigest()
        return f'analytics-preference:{digest}'


@method_decorator(csrf_protect, name='dispatch')
class AnalyticsPreferenceView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PreferenceThrottle]

    def post(self, request):
        if not isinstance(request.data, dict) or set(request.data) != {'automation_signal'}:
            return Response({'detail': 'Send only an anonymous automation signal.'}, status=400)
        signal = request.data['automation_signal']
        if signal not in ('reported', 'unknown'):
            return Response({'detail': 'Invalid automation signal.'}, status=400)
        day = timezone.now().date().isoformat()
        key = uuid.uuid5(uuid.NAMESPACE_URL, f'marcdbycartez:analytics-preferences:{day}')
        with transaction.atomic():
            row, _ = AuditEvent.objects.select_for_update().get_or_create(pk=key, defaults={
                'action': ACTION, 'object_type': 'daily_statistics', 'object_id': day,
                'metadata': dict.fromkeys(COUNTERS, 0),
            })
            counts = row.metadata
            counts['opt_out_total'] += 1
            counts['automation_reported' if signal == 'reported' else 'unclassified'] += 1
            row.metadata = counts
            row.save(update_fields=['metadata'])
        return Response(status=204)


def preference_summary(days):
    since = (timezone.now().date() - timedelta(days=days - 1)).isoformat()
    rows = AuditEvent.objects.filter(action=ACTION, object_id__gte=since).order_by('object_id')
    totals = dict.fromkeys(COUNTERS, 0)
    daily = []
    for row in rows:
        counts = {key: int(row.metadata.get(key, 0)) for key in COUNTERS}
        for key in COUNTERS:
            totals[key] += counts[key]
        daily.append({'date': row.object_id, **counts, 'google_status': row.metadata.get('google_status', 'pending')})
    return {**totals, 'daily': daily, 'unit': 'off_choices', 'classification': 'signals_only'}


def preference_payload(row):
    # One fixed reporting-service identity, never a visitor's Google/client/session ID.
    # These summary events must be excluded from visitor/user-count analyses.
    midnight = datetime.combine(datetime.fromisoformat(row.object_id).date(), time(), tzinfo=dt_timezone.utc)
    events = []
    for key, name in [('opt_out_total', 'analytics_opt_out_total'),
                      ('automation_reported', 'analytics_opt_out_automation'),
                      ('unclassified', 'analytics_opt_out_unclassified')]:
        count = int(row.metadata.get(key, 0))
        if count:
            events.append({'name': name, 'params': {'value': count, 'summary_date': row.object_id,
                                                   'source_layer': 'preference_summary'}})
    return {'client_id': '1.1', 'timestamp_micros': int(midnight.timestamp() * 1000000),
            'consent': {'ad_user_data': 'DENIED', 'ad_personalization': 'DENIED'}, 'events': events}


def report_preference_totals():
    """Claim and send completed UTC-day summaries once. Never retry ambiguous sends."""
    from api.analytics import configured
    if not configured() or not settings.GA_API_SECRET:
        return 0
    today = timezone.now().date()
    keys = list(AuditEvent.objects.filter(action=ACTION, object_id__lt=today.isoformat())
                .order_by('object_id').values_list('pk', flat=True))
    sent = 0
    for key in keys:
        with transaction.atomic():
            row = AuditEvent.objects.select_for_update().get(pk=key)
            if row.metadata.get('google_status'):
                continue
            # GA backdating supports up to 72 hours. Older local totals remain available.
            if row.object_id < (today - timedelta(days=2)).isoformat():
                row.metadata['google_status'] = 'too_old'
                row.save(update_fields=['metadata'])
                continue
            payload = preference_payload(row)
            row.metadata['google_status'] = 'attempted'
            row.save(update_fields=['metadata'])
        status = 'uncertain'
        try:
            response = requests.post('https://www.google-analytics.com/mp/collect',
                params={'measurement_id': settings.GA_MEASUREMENT_ID, 'api_secret': settings.GA_API_SECRET},
                json=payload, timeout=(2, 5))
            status = 'accepted' if 200 <= response.status_code < 300 else 'rejected'
            if status == 'accepted':
                sent += 1
        except requests.RequestException:
            logger.warning('Anonymous preference summary delivery uncertain; not retried.')
        with transaction.atomic():
            row = AuditEvent.objects.select_for_update().get(pk=key)
            row.metadata['google_status'] = status
            row.save(update_fields=['metadata'])
    return sent
