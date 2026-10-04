"""Local-disk upload storage for development only.

Mirrors the S3 flow end to end so the real browser upload path can be exercised
without cloud credentials: a short-lived signed PUT link, byte-level validation
on finalize, a copy of the verified bytes to a new `files/` key, and a signed
download link. Settings refuse this backend in production.
"""
import json
import uuid
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from api.file_types import ALLOWED, validate_file_contents

SALT = "api.local_storage"
LINK_SECONDS = 600


def _root():
    return Path(settings.LOCAL_UPLOAD_ROOT).resolve()


def _path(object_name):
    # Object names are server-generated (pending/<uuid>, files/<pk>/<uuid>), but
    # resolve and check anyway so a key can never escape the upload root.
    path = (_root() / object_name).resolve()
    if _root() not in path.parents:
        raise Http404()
    return path


def _meta_path(path):
    return path.with_name(path.name + ".json")


def _sign(asset, operation):
    return signing.dumps({"op": operation, "key": asset.object_name,
                          "type": asset.content_type, "size": asset.size,
                          "name": asset.original_name}, salt=SALT)


def _require_local():
    if settings.UPLOAD_STORAGE_BACKEND != "local":
        raise Http404()


def _unsign(token, operation):
    try:
        data = signing.loads(token or "", salt=SALT, max_age=LINK_SECONDS)
    except signing.BadSignature:
        return None
    return data if data.get("op") == operation else None


def signed_upload_url(asset):
    return f"/api/v1/local-storage/upload/?token={quote(_sign(asset, 'put'))}"


def signed_download_url(asset):
    return f"/api/v1/local-storage/download/?token={quote(_sign(asset, 'get'))}"


def validate_uploaded_blob(asset):
    path = _path(asset.object_name)
    if not path.exists():
        return False, "Upload was not found."
    meta = json.loads(_meta_path(path).read_text())
    data = path.read_bytes()

    def reject(message):
        path.unlink(missing_ok=True)
        _meta_path(path).unlink(missing_ok=True)
        return False, message

    if len(data) != asset.size or asset.size > settings.MAX_UPLOAD_FILE_BYTES:
        return reject("Uploaded file size does not match the request.")
    if meta.get("content_type") != asset.content_type or asset.content_type not in ALLOWED:
        return reject("Uploaded file type does not match the request.")
    valid, message = validate_file_contents(data, asset.content_type)
    if not valid:
        return reject(message)
    # Same rule as S3: verified bytes move to a new key, so the still-valid PUT
    # link for the pending key cannot overwrite an accepted file.
    destination = f"files/{asset.pk}/{uuid.uuid4()}"
    target = _path(destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    _meta_path(target).write_text(json.dumps(meta))
    path.unlink(missing_ok=True)
    _meta_path(path).unlink(missing_ok=True)
    asset.object_name = destination
    return True, ""


@csrf_exempt
@require_http_methods(["PUT"])
def upload_view(request):
    _require_local()
    claim = _unsign(request.GET.get("token"), "put")
    if not claim:
        return HttpResponse("This upload link is invalid or has expired.", status=403)
    content_type = request.headers.get("Content-Type", "").split(";")[0].strip().lower()
    if content_type != claim["type"]:
        return HttpResponseBadRequest("Content-Type does not match the signed upload.")
    data = request.read(settings.MAX_UPLOAD_FILE_BYTES + 1)
    if len(data) != claim["size"]:
        return HttpResponseBadRequest("File size does not match the signed upload.")
    path = _path(claim["key"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    _meta_path(path).write_text(json.dumps({"content_type": content_type}))
    return HttpResponse(status=200)


@require_GET
def download_view(request):
    _require_local()
    claim = _unsign(request.GET.get("token"), "get")
    if not claim:
        return HttpResponse("This download link is invalid or has expired.", status=403)
    path = _path(claim["key"])
    if not path.exists():
        raise Http404()
    filename = claim["name"].replace('"', "").replace("\r", "").replace("\n", "")
    return FileResponse(path.open("rb"), as_attachment=True, filename=filename,
                        content_type=claim["type"])
