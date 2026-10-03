import requests
from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError

from communications.microsoft_authorization import start_authorization
from communications.microsoft_email import MicrosoftEmailUnavailable


class Command(BaseCommand):
    help = "Print an owner browser authorization link; never prints access/refresh tokens."

    def handle(self, *args, **options):
        try:
            link = start_authorization()
        except (requests.RequestException, ImproperlyConfigured, ValueError, MicrosoftEmailUnavailable):
            raise CommandError("Microsoft browser authorization could not start. Check its certificate, registration, and callback settings.") from None
        self.stdout.write(link)
        self.stdout.write("Open this link in your usual browser and authorize the configured sending mailbox.")
