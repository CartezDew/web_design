from django.conf import settings
from django.core.management.commands.flush import Command as DjangoFlushCommand
from django.core.management.base import CommandError


class Command(DjangoFlushCommand):
    help = "Flush data only outside production."

    def handle(self, *args, **options):
        if settings.DJANGO_ENV == "production":
            raise CommandError("flush is disabled in production.")
        return super().handle(*args, **options)
