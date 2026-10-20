import secrets
from zoneinfo import available_timezones

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def validate_time_zone(value):
    if value not in available_timezones():
        raise ValidationError(_('%(value)s is not a known time zone.'), params={'value': value})


def new_inbound_token():
    """The private part of the user's forwarding address, e.g. "a3f9c2e17b" in a3f9c2e17b@inbound.example."""
    return secrets.token_hex(5)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **fields):
        if not email:
            raise ValueError('Users need an email address.')
        user = self.model(email=self.normalize_email(email).lower(), **fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **fields):
        return self.create_user(email, password, is_staff=True, is_superuser=True, email_verified=True, **fields)


class User(AbstractBaseUser, PermissionsMixin):
    """An ApplyTrack account. People sign in with their email, so there's no username."""

    email = models.EmailField(unique=True)
    # One field: many Indonesian names don't split into first and last name.
    name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    # Until the emailed link is opened, the account can only see the "check your email" page.
    email_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)  # can open the Django admin
    date_joined = models.DateTimeField(default=timezone.now)

    # Preferences, edited on the Settings page.
    weekly_goal = models.PositiveSmallIntegerField(
        default=5, validators=[MinValueValidator(1), MaxValueValidator(50)]
    )  # applications per week the dashboard tracks
    # Decides "today", "this week" and the clock time of interviews for this user (IANA name).
    time_zone = models.CharField(max_length=64, default='Asia/Jakarta', validators=[validate_time_zone])
    language = models.CharField(max_length=5, choices=settings.LANGUAGES, default='id')
    # Job portal emails forwarded to <inbound_token>@INBOUND_EMAIL_DOMAIN are imported for this user.
    inbound_token = models.CharField(max_length=20, unique=True, default=new_inbound_token)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email
