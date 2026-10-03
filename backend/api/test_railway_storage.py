"""Railway storage regressions; all provider access uses local mocks."""
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import Mock, patch
import uuid

from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image
from pypdf import PdfWriter

from api.s3_storage import signed_upload_url, validate_uploaded_blob
from intakes.models import ProjectBrief


def pdf_bytes():
    stream = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(stream)
    return stream.getvalue()


@override_settings(S3_BUCKET_NAME="local-test-uploads", S3_BACKUP_BUCKET_NAME="local-test-backups",
                   UPLOAD_BACKUP_REQUIRED=True)
class RailwayStorageTests(SimpleTestCase):
    def asset(self, data=b"%PDF-1.4\nlocal test\n", content_type="application/pdf"):
        return SimpleNamespace(pk=uuid.uuid4(), object_name="pending/local-test", size=len(data),
                               content_type=content_type, original_name="reference.pdf")

    def storage(self, data, content_type="application/pdf"):
        storage = Mock()
        storage.head_object.return_value = {"ContentLength":len(data),
            "ContentType": content_type, "ETag": '"local-etag"'}
        storage.get_object.return_value = {"Body": BytesIO(data)}
        return storage

    @patch("api.s3_storage.client")
    def test_upload_url_enforces_exact_reserved_size_and_expiry(self, provider):
        asset = self.asset()
        signed_upload_url(asset)
        options = provider.return_value.generate_presigned_url.call_args.kwargs
        self.assertEqual(options["Params"]["ContentLength"], asset.size)
        self.assertEqual(options["Params"]["ContentType"], "application/pdf")
        self.assertEqual(options["ExpiresIn"], 600)

    @patch("api.s3_storage.client")
    def test_verified_pdf_is_stored_and_backed_up_away_from_upload_destination(self, provider):
        data = pdf_bytes()
        primary, backup = self.storage(data), Mock()
        provider.side_effect = [primary, backup]
        asset = self.asset(data)
        valid, _ = validate_uploaded_blob(asset)
        self.assertTrue(valid)
        self.assertTrue(asset.object_name.startswith(f"files/{asset.pk}/"))
        self.assertEqual(primary.put_object.call_args.kwargs["Key"], asset.object_name)
        self.assertEqual(backup.put_object.call_args.kwargs["Key"], asset.object_name)
        self.assertEqual(backup.put_object.call_args.kwargs["Body"], data)
        self.assertEqual(primary.get_object.call_args.kwargs["IfMatch"], '"local-etag"')

    @patch("api.s3_storage.client")
    def test_backup_failure_keeps_asset_pending_for_retry(self, provider):
        data = pdf_bytes()
        primary, backup = self.storage(data), Mock()
        backup.put_object.side_effect = RuntimeError("local simulated outage")
        provider.side_effect = [primary, backup]
        asset = self.asset(data)
        with self.assertRaises(RuntimeError):
            validate_uploaded_blob(asset)
        self.assertEqual(asset.object_name, "pending/local-test")

    @patch("api.s3_storage.client")
    def test_file_size_mismatch_is_never_accepted_or_copied(self, provider):
        primary = self.storage(b"oversized local data")
        provider.return_value = primary
        valid, _ = validate_uploaded_blob(self.asset(b"short"))
        self.assertFalse(valid)
        primary.get_object.assert_not_called()
        primary.put_object.assert_not_called()

    @patch("api.s3_storage.client")
    def test_fake_image_is_rejected_even_when_header_matches(self, provider):
        data = b"\x89PNG\r\n\x1a\nnot-an-image"
        primary = self.storage(data, "image/png")
        provider.return_value = primary
        valid, _ = validate_uploaded_blob(self.asset(data, "image/png"))
        self.assertFalse(valid)
        primary.put_object.assert_not_called()

    @patch("api.s3_storage.client")
    def test_real_screenshot_is_decoded_and_backed_up(self, provider):
        stream = BytesIO()
        Image.new("RGB", (24,24), "white").save(stream, format="PNG")
        data = stream.getvalue()
        primary, backup = self.storage(data, "image/png"), Mock()
        provider.side_effect = [primary, backup]
        valid, _ = validate_uploaded_blob(self.asset(data,"image/png"))
        self.assertTrue(valid)
        backup.put_object.assert_called_once()


class FrontendIntakeStorageTests(TestCase):
    def test_contact_urls_and_all_frontend_discovery_answers_are_persisted(self):
        fields = {"name":"Alex Client", "email":"alex@example.test", "phone":"4045550101",
            "company":"Example business", "overview":"Build a custom website", "mission":"Audience and difference",
            "domain":"https://example.test", "goal":"More enquiries", "success":"Qualified client leads",
            "features":"Services, booking, client portal", "package":"Business", "launch_date":"2027-01-15",
            "inspiration_link":"https://inspiration.example.test", "offerings":"Consulting services",
            "brand":"Brand direction\n\nContent readiness: Some content is ready",
            "integrations":"Calendar and CRM", "notes":"Project approver: Alex\n\nUse images as inspiration"}
        response = self.client.post("/api/v1/public/briefs/", {**fields, "idempotency_key":str(uuid.uuid4())},
                                    content_type="application/json")
        self.assertEqual(response.status_code,201,response.json())
        brief = ProjectBrief.objects.get(pk=response.json()["id"])
        for key, value in fields.items():
            self.assertEqual(str(getattr(brief,key)),value,key)
