"""Private Railway uploads, validated before immutable storage and backup."""
import uuid
import warnings
from io import BytesIO
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings
from PIL import Image


def client(backup=False):
    prefix = "S3_BACKUP_" if backup else "S3_"
    endpoint = getattr(settings, prefix + "ENDPOINT_URL")
    access_key = getattr(settings, prefix + "ACCESS_KEY_ID")
    secret = getattr(settings, prefix + "SECRET_ACCESS_KEY")
    if not all((endpoint, access_key, secret, getattr(settings, prefix + "BUCKET_NAME"))):
        raise RuntimeError("Private upload storage is not configured.")
    return boto3.client("s3", endpoint_url=endpoint,
        aws_access_key_id=access_key, aws_secret_access_key=secret,
        region_name=getattr(settings, prefix + "REGION"),
        config=Config(signature_version="s3v4",
            s3={"addressing_style": settings.S3_ADDRESSING_STYLE},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
            connect_timeout=5, read_timeout=20, retries={"max_attempts": 2}))


def signed_upload_url(asset):
    return client().generate_presigned_url("put_object", Params={
        "Bucket": settings.S3_BUCKET_NAME, "Key": asset.object_name,
        "ContentType": asset.content_type, "ContentLength": asset.size,
    }, ExpiresIn=600, HttpMethod="PUT")


def signed_download_url(asset):
    filename = asset.original_name.replace('"', '').replace("\r", '').replace("\n", '')
    return client().generate_presigned_url("get_object", Params={
        "Bucket": settings.S3_BUCKET_NAME, "Key": asset.object_name,
        "ResponseContentDisposition": "attachment; filename*=UTF-8''" + quote(filename, safe=""),
    }, ExpiresIn=600, HttpMethod="GET")


def validate_uploaded_blob(asset):
    from api.storage import ALLOWED_TYPES
    storage = client()
    try:
        metadata = storage.head_object(Bucket=settings.S3_BUCKET_NAME, Key=asset.object_name)
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return False, "Upload was not found."
        raise
    if metadata["ContentLength"] != asset.size or asset.size > settings.MAX_UPLOAD_FILE_BYTES:
        return False, "Uploaded file size does not match the request."
    if metadata.get("ContentType") != asset.content_type or asset.content_type not in ALLOWED_TYPES:
        return False, "Uploaded file type does not match the request."
    response = storage.get_object(Bucket=settings.S3_BUCKET_NAME, Key=asset.object_name,
                                  IfMatch=metadata["ETag"])
    stream = response["Body"]
    try:
        data = stream.read(settings.MAX_UPLOAD_FILE_BYTES + 1)
    finally:
        stream.close()
    if len(data) != asset.size:
        return False, "Uploaded file size does not match the request."
    valid = any(data.startswith(signature) for signature in ALLOWED_TYPES[asset.content_type])
    if asset.content_type == "image/webp":
        valid = valid and data[8:12] == b"WEBP"
    if not valid:
        return False, "File contents do not match the declared type."
    if asset.content_type.startswith("image/"):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(BytesIO(data)) as image:
                    if image.width * image.height > 40_000_000:
                        raise ValueError("Image dimensions too large")
                    image.verify()
        except Exception:
            return False, "This image cannot be read or has oversized dimensions."
    # Upload only the verified bytes to a new key. An unexpired client PUT link
    # still targets the pending key, so it cannot replace an accepted file.
    destination = f"files/{asset.pk}/{uuid.uuid4()}"
    backup = client(backup=True) if settings.UPLOAD_BACKUP_REQUIRED or settings.S3_BACKUP_BUCKET_NAME else None
    storage.put_object(Bucket=settings.S3_BUCKET_NAME, Key=destination, Body=data,
                       ContentType=asset.content_type)
    if backup:
        backup.put_object(Bucket=settings.S3_BACKUP_BUCKET_NAME, Key=destination, Body=data,
                          ContentType=asset.content_type)
    asset.object_name = destination
    return True, ""
