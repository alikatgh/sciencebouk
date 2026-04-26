from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from django.utils import timezone

from accounts.models import InviteCode


class Command(BaseCommand):
    help = "Create a beta invite code and print the raw code once."

    def add_arguments(self, parser):
        parser.add_argument("--label", default="", help="Human-readable label for this invite batch.")
        parser.add_argument("--code", default="", help="Optional custom invite code. Leave blank to generate one.")
        parser.add_argument("--max-uses", type=int, default=1, help="How many accounts can redeem this code.")
        parser.add_argument("--expires-in-days", type=int, default=0, help="Optional expiry window in days.")

    def handle(self, *args, **options):
        max_uses = options["max_uses"]
        if max_uses < 1:
            raise CommandError("--max-uses must be at least 1")

        raw_code = options["code"].strip() or InviteCode.generate_code()
        expires_in_days = options["expires_in_days"]
        expires_at = timezone.now() + timedelta(days=expires_in_days) if expires_in_days else None

        invite = InviteCode(
            label=options["label"],
            max_uses=max_uses,
            expires_at=expires_at,
        )
        invite.set_code(raw_code)

        try:
            invite.save()
        except IntegrityError as exc:
            raise CommandError("That invite code already exists.") from exc

        self.stdout.write(self.style.SUCCESS("Invite created. Copy this code now:"))
        self.stdout.write(raw_code)
