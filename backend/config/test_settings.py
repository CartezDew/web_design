"""Tests always use an isolated database and never load a provider credential."""
import os

os.environ.update(DJANGO_ENV="test", DATABASE_URL="sqlite:///:memory:", DEBUG="true",
                  TURNSTILE_REQUIRED="false", RESEND_API_KEY="", GS_BUCKET_NAME="",
                  GS_CREDENTIALS_JSON="")
os.environ.update(UPLOAD_STORAGE_BACKEND="gcs", S3_ENDPOINT_URL="", S3_BUCKET_NAME="",
                  S3_ACCESS_KEY_ID="", S3_SECRET_ACCESS_KEY="", S3_BACKUP_ENDPOINT_URL="",
                  S3_BACKUP_BUCKET_NAME="", S3_BACKUP_ACCESS_KEY_ID="", S3_BACKUP_SECRET_ACCESS_KEY="",
                  UPLOAD_BACKUP_REQUIRED="false")
os.environ["NATIVE_FORM_PROTECTION"] = "false"
from .settings import *  # noqa: F403,E402

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

GA_MEASUREMENT_ID = ""
GA_PROPERTY_ID = ""
GA_API_SECRET = ""
