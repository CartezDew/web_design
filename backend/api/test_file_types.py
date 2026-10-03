from io import BytesIO
from unittest.mock import patch
import uuid

from django.test import SimpleTestCase, TestCase
from PIL import Image
from pypdf import PdfWriter

from api.file_types import IMAGE_FORMATS, validate_file_contents
from api.tokens import issue_token
from intakes.models import ProjectBrief


class FileContentTests(SimpleTestCase):
    def test_every_supported_image_format_decodes_and_rejects_wrong_type(self):
        for mime, image_format in IMAGE_FORMATS.items():
            with self.subTest(mime=mime):
                stream = BytesIO()
                Image.new("RGB", (24, 24), "red").save(stream, format=image_format)
                data = stream.getvalue()
                self.assertEqual(validate_file_contents(data, mime), (True, ""))
                wrong_type = "image/jpeg" if mime != "image/jpeg" else "image/png"
                self.assertFalse(validate_file_contents(data, wrong_type)[0])
                self.assertFalse(validate_file_contents(data[:16], mime)[0])

    def test_pdf_requires_readable_pages_not_just_a_pdf_header(self):
        for data in (b"%PDF-1.7\nnot a PDF", b"<html>document</html>", b"PK\x03\x04word document"):
            with self.subTest(data=data):
                self.assertFalse(validate_file_contents(data, "application/pdf")[0])
        stream = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.write(stream)
        self.assertEqual(validate_file_contents(stream.getvalue(), "application/pdf"), (True, ""))
        writer.encrypt("private-password")
        stream = BytesIO()
        writer.write(stream)
        self.assertIn("without a password", validate_file_contents(stream.getvalue(), "application/pdf")[1])

    def test_svg_and_other_documents_are_not_allowed(self):
        for mime in ("image/svg+xml", "text/plain", "application/zip", "image/heic", "application/msword"):
            self.assertFalse(validate_file_contents(b"test", mime)[0])


class FileReservationTests(TestCase):
    def setUp(self):
        self.brief = ProjectBrief.objects.create(name="Client", email="client@example.test",
                                                overview="File audit", idempotency_key=str(uuid.uuid4()))

    def prepare(self, **overrides):
        data = dict(brief=str(self.brief.pk), upload_token=issue_token("upload", self.brief.pk),
                    group="inspiration", size=100, request_key=str(uuid.uuid4()), **overrides)
        return self.client.post("/api/v1/assets/prepare/", data, content_type="application/json")

    @patch("api.uploads.signed_upload_url", return_value="https://storage.example.test/put")
    def test_image_extensions_and_pdf_are_accepted_but_other_documents_are_rejected(self, storage):
        extensions = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp",
                      "gif": "image/gif", "avif": "image/avif", "bmp": "image/bmp", "tif": "image/tiff",
                      "tiff": "image/tiff", "pdf": "application/pdf"}
        for extension, mime in extensions.items():
            with self.subTest(extension=extension):
                response = self.prepare(name=f"reference.{extension.upper()}", content_type=mime)
                self.assertEqual(response.status_code, 201, response.data)
        for name, mime in (("x.svg", "image/svg+xml"), ("x.docx", "application/pdf"),
                           ("x.heic", "image/heic"), ("x.png", "image/jpeg"), ("x.exe", "image/png")):
            with self.subTest(name=name):
                self.assertEqual(self.prepare(name=name, content_type=mime).status_code, 400)
