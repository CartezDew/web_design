import time
from unittest.mock import patch
from django.core import signing
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory
from api.form_protection import issue_form_guard, verify_form_guard
from api.throttles import PublicFormThrottle
from rest_framework.exceptions import ValidationError


@override_settings(NATIVE_FORM_PROTECTION=True, TURNSTILE_REQUIRED=False)
class NativeFormProtectionTests(TestCase):
    def payload(self, **changes):
        return {"name": "Alex Client", "email": "alex@example.test", "overview": "A business website",
                "idempotency_key": "native-check",
                "form_guard": signing.dumps({"started":time.time()-2,"nonce":"test"},salt="marcd.public-form"),
                "contact_fax":"", **changes}

    def test_valid_form_is_saved_with_native_protection(self):
        response=self.client.post('/api/v1/public/briefs/',self.payload(),content_type='application/json')
        self.assertEqual(response.status_code,201,response.json())

    def test_missing_forged_and_filled_trap_never_save_a_brief(self):
        for changes in [{"form_guard":""},{"form_guard":"forged"},{"form_guard":[]},{"contact_fax":"bot filled"}]:
            response=self.client.post('/api/v1/public/briefs/',self.payload(**changes),content_type='application/json')
            self.assertEqual(response.status_code,400)
        from intakes.models import ProjectBrief
        self.assertFalse(ProjectBrief.objects.exists())

    def test_immediate_and_expired_tokens_are_rejected(self):
        request=type('Request',(),{})()
        request.data={"form_guard":issue_form_guard()["token"]}
        with self.assertRaises(ValidationError): verify_form_guard(request)
        with patch('api.form_protection.time.time',return_value=time.time()-7201):
            request.data={"form_guard":issue_form_guard()["token"]}
        with self.assertRaises(ValidationError): verify_form_guard(request)

    def test_public_limit_is_shared_across_new_worker_instances(self):
        request=APIRequestFactory().post('/',{},REMOTE_ADDR='192.0.2.1')
        for _ in range(10):
            self.assertTrue(PublicFormThrottle().allow_request(request,None))
        self.assertFalse(PublicFormThrottle().allow_request(request,None))

    @override_settings(SECURE_SSL_REDIRECT=True, ALLOWED_HOSTS=['healthcheck.railway.app'])
    def test_only_readiness_is_exempt_from_internal_http_redirect(self):
        self.assertEqual(self.client.get('/api/v1/health/',SERVER_NAME='healthcheck.railway.app').status_code,200)
        self.assertEqual(self.client.get('/api/v1/auth/csrf/',SERVER_NAME='healthcheck.railway.app').status_code,301)
