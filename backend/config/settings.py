from pathlib import Path
import os

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False),
    DJANGO_ENV=(str, "development"),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173"]),
    CSRF_TRUSTED_ORIGINS=(list, ["http://localhost:5173"]),
)
environ.Env.read_env(BASE_DIR / ".env")

DJANGO_ENV = env("DJANGO_ENV")
DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY", default="dev-only-change-me")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

if DJANGO_ENV == "production" and (
    DEBUG or SECRET_KEY == "dev-only-change-me" or len(SECRET_KEY) < 50
):
    raise ImproperlyConfigured("Production requires DEBUG=false and a strong SECRET_KEY.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "storages",
    "anymail",
    "accounts",
    "audit",
    "assets",
    "intakes",
    "projects",
    "scheduling",
    "communications",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "api.middleware.PrivateApiResponseMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "config.wsgi.application"

DATABASE_URL = env("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
if DJANGO_ENV == "production" and DATABASE_URL.startswith("sqlite"):
    raise ImproperlyConfigured("Production must use PostgreSQL.")
DATABASES = {"default": env.db_url_config(DATABASE_URL)}
DATABASES["default"]["CONN_MAX_AGE"] = 600
DATABASES["default"]["ATOMIC_REQUESTS"] = True

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
}

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = DJANGO_ENV == "production"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = DJANGO_ENV == "production"
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_DOMAIN = env("CSRF_COOKIE_DOMAIN", default=None)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=DJANGO_ENV == "production")
# Railway probes this one database readiness endpoint over internal HTTP.
# All client, authentication, and admin endpoints still require HTTPS.
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health/$"]
SECURE_HSTS_SECONDS = 31536000 if DJANGO_ENV == "production" else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = DJANGO_ENV == "production"
SECURE_HSTS_PRELOAD = DJANGO_ENV == "production"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "60/hour", "user": "1000/hour", "public_form": "10/hour"},
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "api.exceptions.api_exception_handler",
}

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Cartez Dewberry <letsbuild@marcdbycartez.com>")
ADMIN_NOTIFICATION_EMAIL = env("ADMIN_NOTIFICATION_EMAIL", default="letsbuild@marcdbycartez.com")
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="resend" if env("RESEND_API_KEY", default="") else "console")
EMAIL_BACKENDS = {
    "resend": "anymail.backends.resend.EmailBackend",
    "microsoft365": "communications.microsoft_email.EmailBackend",
    "console": "django.core.mail.backends.console.EmailBackend",
}
if EMAIL_PROVIDER not in EMAIL_BACKENDS:
    raise ImproperlyConfigured("Choose a supported EMAIL_PROVIDER.")
EMAIL_BACKEND = EMAIL_BACKENDS[EMAIL_PROVIDER]
ANYMAIL = {"RESEND_API_KEY": env("RESEND_API_KEY", default="")}
MICROSOFT_CLIENT_ID = env("MICROSOFT_CLIENT_ID", default="")
MICROSOFT_TENANT_ID = env("MICROSOFT_TENANT_ID", default="")
MICROSOFT_MAILBOX = env("MICROSOFT_MAILBOX", default="letsbuild@marcdbycartez.com").strip().lower()
MICROSOFT_TOKEN_ENCRYPTION_KEY = env("MICROSOFT_TOKEN_ENCRYPTION_KEY", default="")

GOOGLE_CLOUD_PROJECT = env("GOOGLE_CLOUD_PROJECT", default="")
GS_BUCKET_NAME = env("GS_BUCKET_NAME", default="")
GS_CREDENTIALS_JSON = env("GS_CREDENTIALS_JSON", default="")
UPLOAD_STORAGE_BACKEND = env("UPLOAD_STORAGE_BACKEND", default="gcs")
S3_ENDPOINT_URL = env("S3_ENDPOINT_URL", default="")
S3_BUCKET_NAME = env("S3_BUCKET_NAME", default="")
S3_REGION = env("S3_REGION", default="auto")
S3_ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID", default="")
S3_SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY", default="")
S3_ADDRESSING_STYLE = env("S3_ADDRESSING_STYLE", default="virtual")
S3_BACKUP_ENDPOINT_URL = env("S3_BACKUP_ENDPOINT_URL", default="")
S3_BACKUP_BUCKET_NAME = env("S3_BACKUP_BUCKET_NAME", default="")
S3_BACKUP_REGION = env("S3_BACKUP_REGION", default="auto")
S3_BACKUP_ACCESS_KEY_ID = env("S3_BACKUP_ACCESS_KEY_ID", default="")
S3_BACKUP_SECRET_ACCESS_KEY = env("S3_BACKUP_SECRET_ACCESS_KEY", default="")
UPLOAD_BACKUP_REQUIRED = env.bool("UPLOAD_BACKUP_REQUIRED", default=DJANGO_ENV == "production")
TURNSTILE_SECRET_KEY = env("TURNSTILE_SECRET_KEY", default="")
TURNSTILE_REQUIRED = env.bool("TURNSTILE_REQUIRED", default=DJANGO_ENV == "production")
NATIVE_FORM_PROTECTION = env.bool("NATIVE_FORM_PROTECTION", default=False)
TRUST_RAILWAY_PROXY = env.bool("TRUST_RAILWAY_PROXY", default=False)

MAX_UPLOAD_FILES = 12
MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024
MAX_BRIEF_UPLOAD_BYTES = 25 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"format": "{levelname} {asctime} {name} {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}
