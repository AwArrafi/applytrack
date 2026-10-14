from django.core.exceptions import ValidationError
from django.db import models


# Field names and choice values mirror frontend/lib/types.ts, so the frontend
# can use the API's JSON as-is.
class Application(models.Model):
    class Status(models.TextChoices):
        WISHLIST = 'wishlist', 'Wishlist'
        APPLIED = 'applied', 'Applied'
        SCREENING = 'screening', 'Screening'
        INTERVIEW = 'interview', 'Interview'
        OFFER = 'offer', 'Offer'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'

    class WorkArrangement(models.TextChoices):
        ONSITE = 'onsite', 'On-site'
        HYBRID = 'hybrid', 'Hybrid'
        REMOTE = 'remote', 'Remote'

    company_name = models.CharField(max_length=200)
    job_title = models.CharField(max_length=200)
    job_description = models.TextField(blank=True)
    job_url = models.URLField(max_length=500, blank=True)
    # Empty while the job is still on the wishlist.
    application_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status, default=Status.APPLIED)
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default='USD')
    location = models.CharField(max_length=200, blank=True)
    work_arrangement = models.CharField(
        max_length=10, choices=WorkArrangement, default=WorkArrangement.ONSITE
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.job_title} at {self.company_name}'

    def clean(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValidationError({'salary_max': 'Must be at least the minimum salary.'})


class Interview(models.Model):
    class Type(models.TextChoices):
        PHONE_SCREEN = 'phone_screen', 'Phone screen'
        TECHNICAL = 'technical', 'Technical'
        BEHAVIORAL = 'behavioral', 'Behavioral'
        ONSITE = 'onsite', 'On-site'
        FINAL = 'final', 'Final round'
        OTHER = 'other', 'Other'

    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name='interviews'
    )
    interview_type = models.CharField(max_length=20, choices=Type, default=Type.OTHER)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    location = models.CharField(max_length=200, blank=True)
    meeting_url = models.URLField(max_length=500, blank=True)
    preparation_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f'{self.get_interview_type_display()} with {self.application.company_name}'
