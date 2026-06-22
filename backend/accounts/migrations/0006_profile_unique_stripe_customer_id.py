from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_invitecode_inviteredemption_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="profile",
            constraint=models.UniqueConstraint(
                condition=~Q(stripe_customer_id=""),
                fields=("stripe_customer_id",),
                name="unique_nonempty_stripe_customer_id",
            ),
        ),
    ]