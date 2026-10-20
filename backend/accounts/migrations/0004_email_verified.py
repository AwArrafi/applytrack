from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0003_inbound_token')]

    operations = [
        # Accounts made before verification existed count as verified, so nobody is locked out;
        # new accounts start unverified.
        migrations.AddField('user', 'email_verified', models.BooleanField(default=True)),
        migrations.AlterField('user', 'email_verified', models.BooleanField(default=False)),
    ]
