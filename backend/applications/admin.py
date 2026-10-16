from django.contrib import admin

from .models import Application, Interview, StatusChange


class InterviewInline(admin.TabularInline):
    model = Interview
    extra = 0


class StatusChangeInline(admin.TabularInline):
    model = StatusChange
    extra = 0
    can_delete = False
    readonly_fields = ['from_status', 'to_status', 'changed_at']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'job_title', 'status', 'user', 'application_date', 'updated_at']
    list_filter = ['status', 'work_arrangement']
    search_fields = ['company_name', 'job_title', 'location', 'notes']
    list_select_related = ['user']
    inlines = [InterviewInline, StatusChangeInline]


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ['application', 'interview_type', 'scheduled_at', 'duration_minutes']
    list_filter = ['interview_type']
