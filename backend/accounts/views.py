import logging

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.throttling import ScopedRateThrottle

from .authentication import is_expired
from . import lockout
from .models import User
from .verification import read_token, send_verification_email

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user and their preferences; the Settings page edits everything but id and email."""

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'weekly_goal', 'time_zone', 'language', 'has_password', 'email_verified']
        read_only_fields = ['id', 'email', 'email_verified']

    # False for accounts made with Google: Settings then asks for the email instead of a password.
    has_password = serializers.BooleanField(source='has_usable_password', read_only=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    # The language the visitor was using when signing up becomes the account's language.
    language = serializers.ChoiceField(choices=User._meta.get_field('language').choices, required=False)

    def validate_email(self, email):
        email = email.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(_('An account with this email already exists.'))
        return email

    def validate(self, attrs):
        # Django's password rules: long enough, not too common, not all numbers, not like the email.
        try:
            validate_password(attrs['password'], user=User(email=attrs['email'], name=attrs.get('name', '')))
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)})
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(self.context['request'], email=attrs['email'].lower(), password=attrs['password'])
        if user is None:
            # Same message for "no such email" and "wrong password", so emails can't be probed.
            raise serializers.ValidationError(_('Email or password is incorrect.'))
        attrs['user'] = user
        return attrs


def session_response(user, status_code):
    """The token the frontend keeps in an httpOnly cookie, plus who signed in."""
    token, _created = Token.objects.get_or_create(user=user)
    if is_expired(token):
        token.delete()
        token = Token.objects.create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status_code)


class AuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    # Limits guessing passwords or mass sign-ups; the rate is REST_FRAMEWORK's 'auth' scope.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class RegisterView(AuthView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(**serializer.validated_data)
        try:
            send_verification_email(user)
        except Exception:  # the account exists either way; the "check your email" page can resend
            logger.exception('Could not send the verification email to user %s', user.pk)
        return session_response(user, status.HTTP_201_CREATED)


class LoginView(AuthView):
    def post(self, request):
        email = str(request.data.get('email', ''))
        if lockout.is_locked(email):  # 5 wrong passwords: 15 minutes (accounts/lockout.py)
            raise Throttled(detail=lockout.LOCKED_MESSAGE)
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            if 'non_field_errors' in serializer.errors:  # a wrong password, not a malformed form
                lockout.record_failure(email)
            raise ValidationError(serializer.errors)
        lockout.clear_failures(email)
        return session_response(serializer.validated_data['user'], status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]  # unverified accounts can sign out too

    def post(self, request):
        # Signs out everywhere: there's one token per account.
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    # Unverified accounts too: the frontend reads email_verified here, and the language switch saves here.
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeleteAccountView(APIView):
    """Deletes the signed-in user and everything they own (applications, interviews, status
    history, forwarded emails, sessions: all cascade). Needs the password, or the account's email
    for an account without one (made with Google); can't be undone."""

    class Input(serializers.Serializer):
        password = serializers.CharField(trim_whitespace=False, required=False)
        email = serializers.CharField(required=False)

        def validate(self, attrs):
            user = self.context['user']
            if user.has_usable_password():
                if not user.check_password(attrs.get('password', '')):
                    raise serializers.ValidationError({'password': [_('Your password is incorrect.')]})
            elif attrs.get('email', '').strip().lower() != user.email:
                raise serializers.ValidationError({'email': [_("This is not your account's email.")]})
            return attrs

    # Guessing the password here is limited like sign-in.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        self.Input(data=request.data, context={'user': request.user}).is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyEmailView(AuthView):
    """Opens the emailed link. Works signed out too: the link may be opened on another device."""

    class Input(serializers.Serializer):
        token = serializers.CharField()

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        found = read_token(data.validated_data['token'])
        user = User.objects.filter(pk=found[0], email=found[1], is_active=True).first() if found else None
        if user is None:
            raise ValidationError({'token': [_('This link is invalid or has expired.')]})
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=['email_verified'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResendVerificationView(APIView):
    """Sends the link again, a few times per hour at most (REST_FRAMEWORK's 'verify_email' scope)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify_email'

    def post(self, request):
        if not request.user.email_verified:
            send_verification_email(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
