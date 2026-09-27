import os
from django.conf import settings
from django.core.management.base import CommandError
from django.core.management.commands.migrate import Command as DjangoMigrateCommand


class Command(DjangoMigrateCommand):
    help = "Run migrations, requiring explicit production approval."

    def handle(self, *args, **options):
        if settings.DJANGO_ENV == "production" and os.environ.get("ALLOW_PRODUCTION_MIGRATIONS") != "yes":
            raise CommandError(
                "Production migrations are locked. Verify a backup, inspect the migration, "
                "then set ALLOW_PRODUCTION_MIGRATIONS=yes for this process only."
            )
        return super().handle(*args, **options)
