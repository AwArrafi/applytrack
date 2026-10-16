from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


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
    list_display = ['email', 'name', 'is_staff', 'date_joined']
    search_fields = ['email', 'name']
    fieldsets = [
        (None, {'fields': ['email', 'password', 'name']}),
        ('Permissions', {'fields': ['is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions']}),
        ('Dates', {'fields': ['last_login', 'date_joined']}),
    ]
    add_fieldsets = [(None, {'classes': ['wide'], 'fields': ['email', 'name', 'password1', 'password2']})]
