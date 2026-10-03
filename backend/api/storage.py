import json
import uuid
from io import BytesIO
from PIL import Image
from datetime import timedelta

from django.conf import settings
from google.cloud import storage

ALLOWED_TYPES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "application/pdf": (b"%PDF",),
}


def storage_client():
    if settings.GS_CREDENTIALS_JSON:
        info = json.loads(settings.GS_CREDENTIALS_JSON)
        return storage.Client.from_service_account_info(info, project=settings.GOOGLE_CLOUD_PROJECT or None)
    return storage.Client(project=settings.GOOGLE_CLOUD_PROJECT or None)


def bucket():
    if not settings.GS_BUCKET_NAME:
        raise RuntimeError("GS_BUCKET_NAME is not configured.")
    return storage_client().bucket(settings.GS_BUCKET_NAME)


def signed_upload_url(asset):
    if settings.UPLOAD_STORAGE_BACKEND == "s3":
        from api.s3_storage import signed_upload_url as s3_upload
        return s3_upload(asset)
    blob = bucket().blob(asset.object_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=10),
        method="PUT",
        content_type=asset.content_type,
        headers={"Content-Length": str(asset.size)},
    )


def signed_download_url(asset):
    if settings.UPLOAD_STORAGE_BACKEND == "s3":
        from api.s3_storage import signed_download_url as s3_download
        return s3_download(asset)
    if not settings.GS_BUCKET_NAME:
        return None
    blob = bucket().blob(asset.object_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=10),
        method="GET",
        response_disposition=f'attachment; filename="{asset.original_name.replace(chr(34), "").replace(chr(13), "").replace(chr(10), "")}"',
    )


def validate_uploaded_blob(asset):
    if settings.UPLOAD_STORAGE_BACKEND == "s3":
        from api.s3_storage import validate_uploaded_blob as s3_validate
        return s3_validate(asset)
    blob = bucket().get_blob(asset.object_name)
    if blob is None:
        return False, "Upload was not found."
    blob.reload()
    if blob.size != asset.size or blob.size > settings.MAX_UPLOAD_FILE_BYTES:
        blob.delete()
        return False, "Uploaded file size does not match the request."
    if blob.content_type != asset.content_type or asset.content_type not in ALLOWED_TYPES:
        blob.delete()
        return False, "Uploaded file type does not match the request."
    prefix = blob.download_as_bytes(start=0, end=15, if_generation_match=blob.generation)
    signatures = ALLOWED_TYPES[asset.content_type]
    valid = any(prefix.startswith(signature) for signature in signatures)
    if asset.content_type == "image/webp":
        valid = valid and prefix[8:12] == b"WEBP"
    if not valid:
        blob.delete()
        return False, "File contents do not match the declared type."
    # Decode image content, not just its magic bytes; prevent decompression bombs.
    if asset.content_type.startswith("image/"):
        try:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(BytesIO(blob.download_as_bytes(if_generation_match=blob.generation))) as img:
                    if img.width * img.height > 40_000_000:
                        raise ValueError("Image dimensions too large")
                    img.verify()
        except Exception:
            return False, "This image cannot be read or has oversized dimensions."
    # Copy the validated generation away from the signed PUT destination so a
    # still-valid upload link cannot overwrite a file already marked accepted.
    destination = f"files/{asset.pk}/{uuid.uuid4()}"
    bucket().copy_blob(blob, bucket(), destination, source_generation=blob.generation,
                       if_source_generation_match=blob.generation, if_generation_match=0)
    asset.object_name = destination
    return True, ""
