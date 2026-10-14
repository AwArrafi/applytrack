from django.contrib import admin

from .models import Application, Interview


class InterviewInline(admin.TabularInline):
    model = Interview
    extra = 0


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'job_title', 'status', 'application_date', 'updated_at']
    list_filter = ['status', 'work_arrangement']
    search_fields = ['company_name', 'job_title', 'location', 'notes']
    inlines = [InterviewInline]


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ['application', 'interview_type', 'scheduled_at', 'duration_minutes']
    list_filter = ['interview_type']
