import hashlib
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.throttling import BaseThrottle
from accounts.models import RequestLimit
from api.client_address import client_ip


class PublicFormThrottle(BaseThrottle):
    """One shared, persistent public submission limit across web workers."""
    def allow_request(self, request, view):
        if request.method != "POST":
            return True
        key = hashlib.sha256(f"public:{client_ip(request) or 'unknown'}".encode()).hexdigest()
        with transaction.atomic():
            row, _ = RequestLimit.objects.select_for_update().get_or_create(
                key=key, defaults={"window": timezone.now()})
            if row.window < timezone.now() - timedelta(hours=1):
                row.window, row.count = timezone.now(), 0
            row.count += 1
            row.save()
            return row.count <= 10

    def wait(self):
        return 3600


class LoginThrottle(BaseThrottle):
    """A shared database limit, rather than a separate counter per web worker."""
    def allow_request(self, request, view):
        if request.method != "POST":
            return True
        identity = client_ip(request) or "unknown"
        email = str(request.data.get("email", "")).strip().lower()
        allowed = True
        for raw, limit in [(f"ip:{identity}", 30), (f"email:{email}", 10)]:
            key = hashlib.sha256(raw.encode()).hexdigest()
            with transaction.atomic():
                row, _ = RequestLimit.objects.select_for_update().get_or_create(
                    key=key, defaults={"window": timezone.now()})
                if row.window < timezone.now() - timedelta(minutes=15):
                    row.window, row.count = timezone.now(), 0
                row.count += 1
                row.save()
                allowed = allowed and row.count <= limit
        return allowed

    def wait(self):
        return 900
