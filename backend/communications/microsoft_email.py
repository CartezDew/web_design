"""Microsoft Graph email using delegated Mail.Send and an encrypted MSAL cache."""
import base64
import re
import uuid
from email.mime.base import MIMEBase
from email.utils import parseaddr

import msal
import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.db import transaction
from django.utils import timezone

from communications.models import MicrosoftMailCredential

SCOPES = ["https://graph.microsoft.com/Mail.Send"]
SEND_URL = "https://graph.microsoft.com/v1.0/me/sendMail"


class MicrosoftEmailUnavailable(RuntimeError):
    pass


class BoundedHttpClient:
    def get(self, url, **kwargs):
        kwargs["timeout"] = kwargs.get("timeout") or 15
        return requests.get(url, **kwargs)

    def post(self, url, **kwargs):
        kwargs["timeout"] = kwargs.get("timeout") or 15
        return requests.post(url, **kwargs)


def configuration():
    try:
        client_id = str(uuid.UUID(settings.MICROSOFT_CLIENT_ID))
        tenant_id = str(uuid.UUID(settings.MICROSOFT_TENANT_ID))
        cipher = Fernet(settings.MICROSOFT_TOKEN_ENCRYPTION_KEY.encode())
    except (ValueError, AttributeError, TypeError):
        raise ImproperlyConfigured("Microsoft email registration and encryption key are not configured.") from None
    return client_id, tenant_id, cipher


def application(cache):
    client_id, tenant_id, _ = configuration()
    options = {}
    client_class = msal.PublicClientApplication
    if settings.MICROSOFT_CLIENT_CERTIFICATE_KEY:
        thumbprint = settings.MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT
        if not re.fullmatch(r"[a-fA-F0-9]{40}", thumbprint):
            raise ImproperlyConfigured("Microsoft client certificate is not configured.")
        client_class = msal.ConfidentialClientApplication
        options["client_credential"] = {"private_key": settings.MICROSOFT_CLIENT_CERTIFICATE_KEY,
                                        "thumbprint": thumbprint}
    return client_class(
        client_id, authority=f"https://login.microsoftonline.com/{tenant_id}",
        token_cache=cache, http_client=BoundedHttpClient(), **options,
    )


def matching_account(app):
    accounts = [a for a in app.get_accounts()
                if a.get("username", "").lower() == settings.MICROSOFT_MAILBOX]
    if len(accounts) != 1:
        raise MicrosoftEmailUnavailable("Authorize the configured Microsoft 365 mailbox.")
    return accounts[0]


def save_authorization(cache, app):
    matching_account(app)
    client_id, tenant_id, cipher = configuration()
    encrypted = cipher.encrypt(cache.serialize().encode()).decode()
    from audit.models import AuditEvent
    with transaction.atomic():
        MicrosoftMailCredential.objects.update_or_create(
            mailbox=settings.MICROSOFT_MAILBOX,
            defaults={"client_id":client_id, "tenant_id":tenant_id, "encrypted_cache":encrypted,
                      "revision":0},
        )
        AuditEvent.objects.create(action="email.microsoft.authorized", object_type="mailbox",
                                 object_id=settings.MICROSOFT_MAILBOX,
                                 metadata={"permission":"Mail.Send", "client_id":client_id})


def access_token():
    client_id, tenant_id, cipher = configuration()
    try:
        credential = MicrosoftMailCredential.objects.get(mailbox=settings.MICROSOFT_MAILBOX)
    except MicrosoftMailCredential.DoesNotExist:
        raise MicrosoftEmailUnavailable("Microsoft 365 email authorization is pending.") from None
    if credential.client_id != client_id or credential.tenant_id != tenant_id:
        raise MicrosoftEmailUnavailable("Reauthorize Microsoft email after changing its registration.")
    cache = msal.SerializableTokenCache()
    try:
        cache.deserialize(cipher.decrypt(credential.encrypted_cache.encode()).decode())
    except (InvalidToken, ValueError, UnicodeError):
        raise MicrosoftEmailUnavailable("Microsoft email authorization could not be decrypted.") from None
    try:
        app = application(cache)
        result = app.acquire_token_silent(SCOPES, account=matching_account(app))
    except requests.RequestException:
        raise MicrosoftEmailUnavailable("Microsoft email authorization is temporarily unavailable.") from None
    if cache.has_state_changed:
        # Optimistic update: do not hold database locks during Microsoft's network calls,
        # or overwrite a newer cache saved concurrently by the web/cron process.
        MicrosoftMailCredential.objects.filter(
            mailbox=credential.mailbox, revision=credential.revision,
            encrypted_cache=credential.encrypted_cache,
        ).update(encrypted_cache=cipher.encrypt(cache.serialize().encode()).decode(),
                 revision=credential.revision + 1, updated_at=timezone.now())
    if not result or not result.get("access_token"):
        raise MicrosoftEmailUnavailable("Microsoft email needs renewed authorization.")
    return result["access_token"]


def recipient(address):
    name, email = parseaddr(address)
    return {"emailAddress": {"address":email, "name":name}}


def payload(message):
    if parseaddr(message.from_email)[1].lower() != settings.MICROSOFT_MAILBOX:
        raise MicrosoftEmailUnavailable("The sender must match the authorized Microsoft mailbox.")
    content, content_type = message.body, "Text"
    for alternative in getattr(message, "alternatives", []):
        if alternative[1] == "text/html":
            content, content_type = alternative[0], "HTML"
    data = {"subject": message.subject, "body": {"contentType":content_type, "content":content},
            "from": recipient(message.from_email),
            "toRecipients": [recipient(address) for address in message.to]}
    for field, addresses in [("ccRecipients", message.cc), ("bccRecipients", message.bcc),
                             ("replyTo", message.reply_to)]:
        if addresses:
            data[field] = [recipient(address) for address in addresses]
    attachments = []
    for attachment in message.attachments:
        if isinstance(attachment, MIMEBase):
            filename, content, kind = attachment.get_filename(), attachment.get_payload(decode=True), attachment.get_content_type()
        else:
            filename, content, kind = attachment
        if isinstance(content, str):
            content = content.encode("utf-8")
        attachments.append({"@odata.type":"#microsoft.graph.fileAttachment", "name":filename or "attachment",
                            "contentType":kind, "contentBytes":base64.b64encode(content).decode()})
    if attachments:
        data["attachments"] = attachments
    return {"message": data, "saveToSentItems": True}


class EmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent = 0
        token = None
        for message in email_messages or []:
            if not message.recipients():
                continue
            try:
                body = payload(message)
                token = token or access_token()
                if getattr(message, "alternatives", []):
                    # Graph JSON accepts only one body. MIME preserves the plain-text
                    # alternative, HTML, reply-to and calendar attachment together.
                    mime = message.message()
                    if message.bcc:
                        mime["Bcc"] = ", ".join(message.bcc)
                    response = requests.post(SEND_URL,
                        data=base64.b64encode(mime.as_bytes(linesep="\r\n")).decode("ascii"),
                        headers={"Authorization":f"Bearer {token}", "Content-Type":"text/plain"}, timeout=20)
                else:
                    response = requests.post(SEND_URL, json=body,
                        headers={"Authorization":f"Bearer {token}"}, timeout=20)
                if response.status_code != 202:
                    # Never include provider bodies, headers, tokens or recipient data in exceptions.
                    raise MicrosoftEmailUnavailable("Microsoft did not accept the email.")
                sent += 1
            except requests.RequestException:
                if not self.fail_silently:
                    raise MicrosoftEmailUnavailable("Microsoft email connection failed.") from None
            except (MicrosoftEmailUnavailable, ImproperlyConfigured):
                if not self.fail_silently:
                    raise
        return sent
