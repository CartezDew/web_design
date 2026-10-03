from ipaddress import ip_address
from django.conf import settings


def client_ip(request):
    """Trust Railway's overwritten X-Real-IP only when explicitly configured."""
    raw = request.META.get("REMOTE_ADDR", "")
    if settings.TRUST_RAILWAY_PROXY:
        raw = request.META.get("HTTP_X_REAL_IP", raw)
    try:
        return str(ip_address(raw))
    except ValueError:
        return None
