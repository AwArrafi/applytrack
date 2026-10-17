import accounts.models
from django.db import migrations, models

# Unique per user, so existing users each need their own value: add the column empty, fill it
# row by row, then make it required and unique (Django's recipe for adding unique fields).


def fill_tokens(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.filter(inbound_token=None):
        user.inbound_token = accounts.models.new_inbound_token()
        user.save(update_fields=['inbound_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_preferences'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='inbound_token',
            field=models.CharField(max_length=20, null=True),
        ),
        migrations.RunPython(fill_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='inbound_token',
            field=models.CharField(default=accounts.models.new_inbound_token, max_length=20, unique=True),
        ),
    ]
