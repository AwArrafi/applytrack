from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


def is_expired(token):
    return token.created < timezone.now() - timedelta(days=settings.AUTH_TOKEN_TTL_DAYS)


class ExpiringTokenAuthentication(TokenAuthentication):
    """DRF's token auth, but a token stops working AUTH_TOKEN_TTL_DAYS after sign-in."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if is_expired(token):
            token.delete()
            raise AuthenticationFailed(_('Your session has expired. Please sign in again.'))
        # From here on this request uses the user's time zone: dates, "today", and the times the API
        # reads and writes. UserTimeZoneMiddleware resets it once the response is done.
        timezone.activate(ZoneInfo(user.time_zone))
        return user, token
