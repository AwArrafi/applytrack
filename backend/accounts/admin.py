from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.core.exceptions import ValidationError

from . import lockout

from .models import User


class AdminLoginForm(AdminAuthenticationForm):
    """The admin's sign-in, with the same per-account lock as the app's (accounts/lockout.py):
    without it, the admin would let anyone guess a staff password without limit."""

    def clean(self):
        email = self.cleaned_data.get('username') or ''
        if lockout.is_locked(email):
            raise ValidationError(lockout.LOCKED_MESSAGE, code='locked')
        try:
            cleaned = super().clean()
        except ValidationError:
            lockout.record_failure(email)
            raise
        lockout.clear_failures(email)
        return cleaned


admin.site.login_form = AdminLoginForm


class CreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['email', 'name']


class ChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Django's UserAdmin assumes a username; these settings swap it for email.
    form = ChangeForm
    add_form = CreationForm
    ordering = ['email']
    list_display = ['email', 'name', 'email_verified', 'is_staff', 'date_joined']
    search_fields = ['email', 'name']
    fieldsets = [
        (None, {'fields': ['email', 'password', 'name']}),
        ('Permissions', {'fields': ['is_active', 'email_verified', 'is_staff', 'is_superuser', 'groups', 'user_permissions']}),
        ('Dates', {'fields': ['last_login', 'date_joined']}),
    ]
    add_fieldsets = [(None, {'classes': ['wide'], 'fields': ['email', 'name', 'password1', 'password2']})]
