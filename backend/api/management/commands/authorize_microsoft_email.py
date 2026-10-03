import msal
import requests
from django.core.management.base import BaseCommand, CommandError
from communications.microsoft_email import application, save_authorization, SCOPES


class Command(BaseCommand):
    help = "Authorize the Microsoft 365 sender interactively; never prints access/refresh tokens."

    def handle(self, *args, **options):
        cache = msal.SerializableTokenCache()
        app = application(cache)
        flow = app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise CommandError("Microsoft sign-in could not start. Check the public-client app registration.")
        # The owner uses this short-lived challenge in Microsoft's own sign-in page.
        # Never output the private device_code, provider response or token cache.
        self.stdout.write(f"Open {flow['verification_uri']} and enter: {flow['user_code']}")
        self.stdout.write("Sign in as the configured sending mailbox and review the Mail.Send consent.")
        self.stdout.flush()
        try:
            result = app.acquire_token_by_device_flow(flow)
        except requests.RequestException:
            raise CommandError("Microsoft could not complete authorization. No credentials were saved; try again.") from None
        if not result.get("access_token"):
            raise CommandError("Microsoft authorization was not completed. No credentials were saved.")
        save_authorization(cache, app)
        self.stdout.write(self.style.SUCCESS("Microsoft sender authorized. Encrypted credentials saved."))
