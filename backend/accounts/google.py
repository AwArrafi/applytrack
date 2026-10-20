"""Sign in with Google (OAuth 2.0 authorization code flow).

The frontend sends the visitor to Google, Google sends them back to the frontend with a one-time
code, and the frontend posts that code here. Django trades it for the visitor's verified email
directly with Google, using the client secret only Django has.
"""

import base64
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError

from .models import User
from .views import AuthView, session_response

logger = logging.getLogger(__name__)

TOKEN_URL = 'https://oauth2.googleapis.com/token'
ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}


def google_identity(code, redirect_uri):
    """The ID token's claims for this code, or None. The token comes straight from Google over
    HTTPS, so its signature needs no separate check (OpenID Connect Core 1.0, 3.1.3.7)."""
    body = urllib.parse.urlencode({
        'code': code,
        'redirect_uri': redirect_uri,  # Google only accepts the one the code was issued for
        'grant_type': 'authorization_code',
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
    }).encode()
    try:
        with urllib.request.urlopen(TOKEN_URL, data=body, timeout=10) as response:
            payload = json.load(response)['id_token'].split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError):
        # URLError includes Google's 400 for a used, expired or forged code.
        logger.warning('Google sign-in: the code exchange failed', exc_info=True)
        return None
    if claims.get('aud') != settings.GOOGLE_CLIENT_ID or claims.get('iss') not in ISSUERS:
        return None
    return claims


class GoogleLoginView(AuthView):
    """Signs in the account with the Google email, creating it on first use. An existing account
    with that email is signed in too: Google has verified the visitor owns the address."""

    class Input(serializers.Serializer):
        code = serializers.CharField()
        redirect_uri = serializers.URLField()
        # The language the visitor was using becomes a new account's language.
        language = serializers.ChoiceField(choices=User._meta.get_field('language').choices, required=False)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        fields = data.validated_data
        claims = google_identity(fields['code'], fields['redirect_uri']) if settings.GOOGLE_CLIENT_ID else None
        failed = ValidationError({'non_field_errors': [_('Could not sign in with Google. Please try again.')]})
        if not claims or claims.get('email_verified') is not True or not claims.get('email'):
            raise failed
        user = User.objects.filter(email=claims['email'].lower()).first()
        if user is None:
            extra = {'language': fields['language']} if 'language' in fields else {}
            # No password (unusable): Google signs them in, or they set one via "forgot password".
            user = User.objects.create_user(
                claims['email'], name=claims.get('name', '')[:150], email_verified=True, **extra
            )
            return session_response(user, status.HTTP_201_CREATED)
        if not user.is_active:
            raise failed
        if not user.email_verified:
            # Someone signed up with this address and a password but never proved they own it,
            # perhaps to wait for the real owner inside the account. The owner just proved it:
            # drop that password and every session made with it.
            user.email_verified = True
            user.set_unusable_password()
            user.save()
            Token.objects.filter(user=user).delete()
        return session_response(user, status.HTTP_200_OK)
