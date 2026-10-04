"""End-to-end upload flow against the development-only local disk backend."""
from io import BytesIO
import tempfile
import uuid
from urllib.parse import urlsplit

from django.core.cache import cache
from django.test import TestCase, override_settings
from PIL import Image
from pypdf import PdfWriter

from api.file_types import IMAGE_FORMATS
from api.tokens import issue_token
from assets.models import Asset
from intakes.models import ProjectBrief

EXTENSIONS = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp",
              "gif": "image/gif", "avif": "image/avif", "bmp": "image/bmp", "tif": "image/tiff",
              "tiff": "image/tiff", "pdf": "application/pdf"}


def sample(mime):
    stream = BytesIO()
    if mime == "application/pdf":
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.write(stream)
    else:
        Image.new("RGB", (32, 32), "red").save(stream, format=IMAGE_FORMATS[mime])
    return stream.getvalue()


class LocalUploadFlowTests(TestCase):
    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.settings = override_settings(UPLOAD_STORAGE_BACKEND="local", LOCAL_UPLOAD_ROOT=self.root.name)
        self.settings.enable()
        self.brief = ProjectBrief.objects.create(name="Client", email="client@example.test",
                                                overview="Local upload audit", idempotency_key=str(uuid.uuid4()))
        self.token = issue_token("upload", self.brief.pk)

    def tearDown(self):
        # DRF's anonymous rate limit counts in the cache; don't spend later tests' quota.
        cache.clear()
        self.settings.disable()
        self.root.cleanup()

    def prepare(self, name, mime, size):
        response = self.client.post("/api/v1/assets/prepare/", dict(
            brief=str(self.brief.pk), upload_token=self.token, group="inspiration",
            name=name, content_type=mime, size=size, request_key=str(uuid.uuid4())),
            content_type="application/json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def put(self, upload_url, data, mime):
        parts = urlsplit(upload_url)
        return self.client.generic("PUT", f"{parts.path}?{parts.query}", data, content_type=mime)

    def finalize(self, asset_id):
        return self.client.post(f"/api/v1/assets/{asset_id}/finalize/", {"upload_token": self.token},
                                content_type="application/json")

    def upload(self, name, mime, data):
        prepared = self.prepare(name, mime, len(data))
        self.assertEqual(self.put(prepared["upload_url"], data, mime).status_code, 200)
        return prepared, self.finalize(prepared["asset"]["id"])

    def test_every_accepted_format_uploads_validates_and_downloads(self):
        for extension, mime in EXTENSIONS.items():
            with self.subTest(extension=extension):
                data = sample(mime)
                prepared, response = self.upload(f"reference.{extension}", mime, data)
                self.assertEqual(response.status_code, 200, response.data)
                asset = Asset.objects.get(pk=prepared["asset"]["id"])
                self.assertTrue(asset.uploaded)
                self.assertTrue(asset.object_name.startswith(f"files/{asset.pk}/"))
                download = response.data.get("download_url")
                self.assertTrue(download)
                parts = urlsplit(download)
                fetched = self.client.get(f"{parts.path}?{parts.query}")
                self.assertEqual(fetched.status_code, 200)
                self.assertEqual(b"".join(fetched.streaming_content), data)

    def test_disguised_file_is_rejected_on_finalize(self):
        prepared, response = self.upload("photo.png", "image/png", b"this is not really an image")
        self.assertEqual(response.status_code, 400)
        self.assertIsNotNone(Asset.objects.get(pk=prepared["asset"]["id"]).deleted_at)

    def test_upload_link_checks_signature_type_and_size(self):
        data = sample("image/png")
        prepared = self.prepare("logo.png", "image/png", len(data))
        url = prepared["upload_url"]
        self.assertEqual(self.put(url + "tampered", data, "image/png").status_code, 403)
        self.assertEqual(self.put(url, data, "image/jpeg").status_code, 400)
        self.assertEqual(self.put(url, data + b"extra", "image/png").status_code, 400)

    def test_endpoints_are_unavailable_on_other_backends(self):
        with override_settings(UPLOAD_STORAGE_BACKEND="s3"):
            self.assertEqual(self.client.generic("PUT", "/api/v1/local-storage/upload/?token=x").status_code, 404)
            self.assertEqual(self.client.get("/api/v1/local-storage/download/?token=x").status_code, 404)
