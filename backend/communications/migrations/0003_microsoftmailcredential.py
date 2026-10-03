from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("communications", "0002_emaildelivery")]
    operations = [
        migrations.CreateModel(
            name="MicrosoftMailCredential",
            fields=[
                ("mailbox", models.EmailField(max_length=254, primary_key=True, serialize=False)),
                ("client_id", models.CharField(max_length=36)),
                ("tenant_id", models.CharField(max_length=36)),
                ("encrypted_cache", models.TextField()),
                ("revision", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        )
    ]
