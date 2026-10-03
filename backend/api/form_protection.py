"""Provider-free form checks; combined with database-backed request limits."""
import time
import uuid
from django.conf import settings
from django.core import signing
from rest_framework.exceptions import ValidationError


def issue_form_guard():
    if not settings.NATIVE_FORM_PROTECTION:
        return None
    return {"token": signing.dumps({"started": time.time(), "nonce": str(uuid.uuid4())},
                                   salt="marcd.public-form"), "waitMs": 1000, "maxAgeMs": 7200000}


def verify_form_guard(request):
    if not settings.NATIVE_FORM_PROTECTION:
        return
    try:
        token = request.data.get("form_guard", "")
        if not isinstance(token, str):
            raise ValueError()
        guard = signing.loads(token,
                              salt="marcd.public-form", max_age=7200)
        age = time.time() - float(guard["started"])
        if age < 1 or age > 7200 or str(request.data.get("contact_fax", "")).strip():
            raise ValueError()
    except (signing.BadSignature, ValueError, TypeError, KeyError):
        raise ValidationError("Please try submitting again. Your information is still here.")
