"""Owner-only OAuth authorization with PKCE, state validation and one-use callbacks."""
import hashlib
import json
import secrets
from datetime import timedelta
from urllib.parse import urlsplit

import msal
import requests
from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from communications.microsoft_email import (
    SCOPES, MicrosoftEmailUnavailable, application, configuration, save_authorization,
)
from communications.models import MicrosoftMailAuthorization


def state_hash(state):
    return hashlib.sha256(state.encode()).hexdigest()


def start_authorization():
    if not settings.MICROSOFT_CLIENT_CERTIFICATE_KEY:
        raise ImproperlyConfigured("Configure the Microsoft web app certificate before authorization.")
    redirect = urlsplit(settings.MICROSOFT_AUTH_REDIRECT_URI)
    if redirect.scheme != "https" or redirect.hostname not in settings.ALLOWED_HOSTS:
        raise ImproperlyConfigured("Microsoft authorization requires the configured API HTTPS callback.")
    _, _, cipher = configuration()
    app = application(msal.SerializableTokenCache())
    flow = app.initiate_auth_code_flow(
        SCOPES, redirect_uri=settings.MICROSOFT_AUTH_REDIRECT_URI,
        state=secrets.token_urlsafe(32), login_hint=settings.MICROSOFT_MAILBOX,
        response_mode="form_post",
    )
    if not flow.get("auth_uri") or not flow.get("state") or not flow.get("code_verifier"):
        raise MicrosoftEmailUnavailable("Microsoft browser authorization could not start.")
    # Starting a new attempt invalidates old links without deleting their records.
    MicrosoftMailAuthorization.objects.filter(claimed_at__isnull=True).update(claimed_at=timezone.now())
    MicrosoftMailAuthorization.objects.create(
        state_hash=state_hash(flow["state"]),
        encrypted_flow=cipher.encrypt(json.dumps(flow).encode()).decode(),
        expires_at=timezone.now() + timedelta(minutes=15),
    )
    return flow["auth_uri"]


def result_page(request, success=False, status=400):
    response = render(request, "communications/microsoft_authorization.html", {"success": success}, status=status)
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


@transaction.non_atomic_requests
@csrf_exempt  # Microsoft posts cross-site; OAuth state/PKCE replace a Django form CSRF token here.
@require_POST
def authorization_callback(request):
    state = request.POST.get("state", "")
    if not state or len(state) > 512:
        return result_page(request)
    now = timezone.now()
    attempt = MicrosoftMailAuthorization.objects.filter(
        state_hash=state_hash(state), claimed_at__isnull=True, expires_at__gt=now,
    ).first()
    if not attempt:
        return result_page(request)
    # Claim once before network I/O, without retaining a database transaction or row lock.
    claimed = MicrosoftMailAuthorization.objects.filter(
        pk=attempt.pk, claimed_at__isnull=True, expires_at__gt=now,
    ).update(claimed_at=now)
    if not claimed:
        return result_page(request)
    try:
        _, _, cipher = configuration()
        flow = json.loads(cipher.decrypt(attempt.encrypted_flow.encode()).decode())
        cache = msal.SerializableTokenCache()
        app = application(cache)
        result = app.acquire_token_by_auth_code_flow(flow, request.POST.dict())
        if not result.get("access_token"):
            return result_page(request)
        save_authorization(cache, app)  # Refuses any mailbox except the configured owner.
    except (InvalidToken, ValueError, UnicodeError, ImproperlyConfigured, MicrosoftEmailUnavailable):
        return result_page(request)
    except requests.RequestException:
        return result_page(request, status=503)
    return result_page(request, success=True, status=200)
