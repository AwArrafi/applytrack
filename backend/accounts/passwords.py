"""Forgotten and changed passwords."""

import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import translation
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User
from .views import AuthView

logger = logging.getLogger(__name__)


def check_password_rules(password, user):
    """Django's password rules, as API field errors."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as error:
        raise serializers.ValidationError(list(error.messages))
    return password


def send_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
    with translation.override(user.language):  # the email speaks the account's language
        send_mail(
            subject=_('Reset your ApplyTrack password'),
            message=_(
                'Hello {name},\n\n'
                'Someone asked to reset the password of your ApplyTrack account. To choose a new one, '
                'open this link within one hour:\n\n{link}\n\n'
                "If you didn't ask for this, ignore this email; your password stays the same."
            ).format(name=user.name or user.email, link=link),
            from_email=None,  # DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
        )


class PasswordResetRequestView(AuthView):
    """Emails a reset link. Answers the same whether or not the email has an account, so the
    form can't be used to find out who uses ApplyTrack."""

    class Input(serializers.Serializer):
        email = serializers.EmailField()

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.filter(email=data.validated_data['email'].lower(), is_active=True).first()
        if user is not None:
            try:
                send_reset_email(user)
            except Exception:  # the user still gets the same answer; the error is in the logs
                logger.exception('Could not send the password reset email to user %s', user.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetConfirmView(AuthView):
    """Sets a new password from the link's uid and token, and signs out every device."""

    class Input(serializers.Serializer):
        uid = serializers.CharField()
        token = serializers.CharField()
        password = serializers.CharField(trim_whitespace=False)

        def validate(self, attrs):
            invalid = serializers.ValidationError({'token': [gettext_lazy('This link is invalid or has expired.')]})
            try:
                user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs['uid'])), is_active=True)
            except (User.DoesNotExist, ValueError, TypeError, OverflowError):
                raise invalid
            if not default_token_generator.check_token(user, attrs['token']):
                raise invalid
            try:
                check_password_rules(attrs['password'], user)
            except serializers.ValidationError as error:
                raise serializers.ValidationError({'password': error.detail})
            attrs['user'] = user
            return attrs

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        user = data.validated_data['user']
        user.set_password(data.validated_data['password'])
        user.save()  # also makes the link unusable: the token depends on the password
        Token.objects.filter(user=user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
    """For a signed-in user who knows their password. Other devices are signed out; this one
    gets a fresh token so it stays signed in."""

    class Input(serializers.Serializer):
        current_password = serializers.CharField(trim_whitespace=False)
        new_password = serializers.CharField(trim_whitespace=False)

        def validate_current_password(self, value):
            if not self.context['user'].check_password(value):
                raise serializers.ValidationError(gettext_lazy('Your current password is incorrect.'))
            return value

        def validate_new_password(self, value):
            return check_password_rules(value, self.context['user'])

    # Guessing the current password is limited like sign-in.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        data = self.Input(data=request.data, context={'user': request.user})
        data.is_valid(raise_exception=True)
        request.user.set_password(data.validated_data['new_password'])
        request.user.save()
        Token.objects.filter(user=request.user).delete()
        return Response({'token': Token.objects.create(user=request.user).key})
