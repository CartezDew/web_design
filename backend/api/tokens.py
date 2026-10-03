"""Narrow, expiring capabilities for visitors who do not yet have accounts."""
from django.core import signing
from rest_framework.exceptions import PermissionDenied


def issue_token(kind, object_id):
    return signing.dumps({"id": str(object_id)}, salt=f"marcd.{kind}")


def require_token(token, kind, object_id, max_age=3600):
    try:
        payload = signing.loads(token or "", salt=f"marcd.{kind}", max_age=max_age)
        if payload.get("id") != str(object_id):
            raise signing.BadSignature()
    except (signing.BadSignature, TypeError, ValueError):
        raise PermissionDenied("This link has expired or is invalid. Please request a new link.")
