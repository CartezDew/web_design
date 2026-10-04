import json
import uuid
from datetime import timedelta

from django.conf import settings
from google.cloud import storage
from api.file_types import ALLOWED, validate_file_contents


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
    if settings.UPLOAD_STORAGE_BACKEND == "local":
        from api.local_storage import signed_upload_url as local_upload
        return local_upload(asset)
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
    if settings.UPLOAD_STORAGE_BACKEND == "local":
        from api.local_storage import signed_download_url as local_download
        return local_download(asset)
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
    if settings.UPLOAD_STORAGE_BACKEND == "local":
        from api.local_storage import validate_uploaded_blob as local_validate
        return local_validate(asset)
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
    if blob.content_type != asset.content_type or asset.content_type not in ALLOWED:
        blob.delete()
        return False, "Uploaded file type does not match the request."
    data = blob.download_as_bytes(if_generation_match=blob.generation)
    valid, message = validate_file_contents(data, asset.content_type)
    if not valid:
        blob.delete()
        return False, message
    # Copy the validated generation away from the signed PUT destination so a
    # still-valid upload link cannot overwrite a file already marked accepted.
    destination = f"files/{asset.pk}/{uuid.uuid4()}"
    bucket().copy_blob(blob, bucket(), destination, source_generation=blob.generation,
                       if_source_generation_match=blob.generation, if_generation_match=0)
    asset.object_name = destination
    return True, ""
