"""Small, escaped, email-client-friendly transactional layouts."""
from urllib.parse import urlsplit
from email.utils import parseaddr

from django.conf import settings
from django.template.loader import render_to_string


def branded_email(heading, *, preheader="", greeting="", paragraphs=(), details=(),
                  action=None, secondary=None, note="", safety=""):
    # Actions are application routes, never links supplied in a customer brief.
    origin = urlsplit(settings.FRONTEND_URL)
    for link in (action, secondary):
        if link:
            target = urlsplit(link[1])
            if target.scheme not in ("http", "https") or target.netloc != origin.netloc:
                raise ValueError("Email actions must point to the configured website.")
    return render_to_string("communications/transactional_email.html", {
        "heading": heading, "preheader": preheader or heading, "greeting": greeting,
        "paragraphs": paragraphs, "details": details, "action": action, "secondary": secondary,
        "note": note, "safety": safety, "site_url": settings.FRONTEND_URL,
        "reply_email": parseaddr(settings.DEFAULT_FROM_EMAIL)[1],
    })
