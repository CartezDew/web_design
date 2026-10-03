from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("communications", "0004_microsoftmailauthorization")]
    operations = [migrations.AddField(
        model_name="emaildelivery", name="html_body", field=models.TextField(blank=True),
    )]
