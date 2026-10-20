"""Email verification: an account made with a password must open an emailed link before it can
use ApplyTrack. Accounts made with Google start verified (Google checked the address)."""

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.utils import translation
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy
from rest_framework.permissions import IsAuthenticated

SALT = 'accounts.verify-email'
LINK_DAYS = 3


class IsVerified(IsAuthenticated):
    """The default for every API view: signed in with a verified email. The few views an
    unverified user needs (who am I, sign out, resend the link) use IsAuthenticated instead."""

    message = gettext_lazy('Verify your email address first.')

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.email_verified


def make_token(user):
    """Signed, so no table is needed; it names the email too, so it only fits this address."""
    return signing.dumps({'user': user.pk, 'email': user.email}, salt=SALT)


def read_token(token):
    """(user id, email) from a link that's genuine and under LINK_DAYS old, else None."""
    try:
        data = signing.loads(token, salt=SALT, max_age=LINK_DAYS * 24 * 60 * 60)
    except signing.BadSignature:  # also raised for expired links
        return None
    return data['user'], data['email']


def send_verification_email(user):
    link = f'{settings.FRONTEND_URL}/verify-email/confirm?token={make_token(user)}'
    with translation.override(user.language):  # the email speaks the account's language
        send_mail(
            subject=_('Verify your ApplyTrack email'),
            message=_(
                'Hello {name},\n\n'
                'Welcome to ApplyTrack. To start using your account, confirm this is your email '
                'by opening this link within {days} days:\n\n{link}\n\n'
                "If you didn't sign up for ApplyTrack, ignore this email."
            ).format(name=user.name or user.email, days=LINK_DAYS, link=link),
            from_email=None,  # DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
        )
