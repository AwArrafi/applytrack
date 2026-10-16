from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.utils import timezone


# Every query for user data goes through owned_by(), so one user never sees another's.
class ApplicationQuerySet(models.QuerySet):
    def owned_by(self, user):
        return self.filter(user=user)


class InterviewQuerySet(models.QuerySet):
    def owned_by(self, user):
        return self.filter(application__user=user)


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

    # Where the job was found and applied for; Analytics compares response rates per source.
    class Source(models.TextChoices):
        LINKEDIN = 'linkedin', 'LinkedIn'
        JOBSTREET = 'jobstreet', 'JobStreet'
        GLINTS = 'glints', 'Glints'
        KALIBRR = 'kalibrr', 'Kalibrr'
        COMPANY_WEBSITE = 'company_website', 'Company website'
        REFERRAL = 'referral', 'Referral'
        OTHER = 'other', 'Other'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
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
    source = models.CharField(max_length=20, choices=Source, default=Source.OTHER)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ApplicationQuerySet.as_manager()

    class Meta:
        ordering = ['-updated_at']
        # The applications list and dashboard read "this user's, newest first".
        indexes = [models.Index(fields=['user', '-updated_at'])]

    def __str__(self):
        return f'{self.job_title} at {self.company_name}'

    def save(self, *args, **kwargs):
        """Saves, and records a StatusChange whenever the status is new or different."""
        with transaction.atomic():
            previous = None if self._state.adding else (
                Application.objects.filter(pk=self.pk).values_list('status', flat=True).first()
            )
            super().save(*args, **kwargs)
            if previous != self.status:
                StatusChange.objects.create(application=self, from_status=previous or '', to_status=self.status)

    def clean(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValidationError({'salary_max': 'Must be at least the minimum salary.'})


class StatusChange(models.Model):
    """History of an application's status, for analytics such as "days until a reply"."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='status_changes')
    # Empty for the first entry, when the application was created.
    from_status = models.CharField(max_length=20, choices=Application.Status, blank=True)
    to_status = models.CharField(max_length=20, choices=Application.Status)
    changed_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f'{self.application}: {self.from_status or "new"} -> {self.to_status}'


class Interview(models.Model):
    # Recruitment stages as they're commonly named in Indonesia; the frontend shows the
    # translated label, these are only the stored codes and admin labels.
    class Type(models.TextChoices):
        HR_INTERVIEW = 'hr_interview', 'HR interview'
        USER_INTERVIEW = 'user_interview', 'Interview with the hiring manager (user)'
        SKILLS_TEST = 'skills_test', 'Skills test / case study'
        PSYCHOTEST = 'psychotest', 'Psychological test'
        GROUP_DISCUSSION = 'group_discussion', 'Group discussion (FGD)'
        FINAL_INTERVIEW = 'final_interview', 'Final interview'
        MEDICAL_CHECKUP = 'medical_checkup', 'Medical check-up'
        OTHER = 'other', 'Other'

    class Outcome(models.TextChoices):
        AWAITING = 'awaiting', 'Awaiting feedback'
        PASSED = 'passed', 'Passed'
        NOT_SELECTED = 'not_selected', 'Not selected'
        CANCELLED = 'cancelled', 'Cancelled'

    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name='interviews'
    )
    interview_type = models.CharField(max_length=20, choices=Type, default=Type.OTHER)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    location = models.CharField(max_length=200, blank=True)
    meeting_url = models.URLField(max_length=500, blank=True)
    preparation_notes = models.TextField(blank=True)
    # Who you're meeting, e.g. "Alex Chen, Staff Engineer".
    interviewer = models.CharField(max_length=200, blank=True)
    # Debrief, filled in after the interview.
    outcome = models.CharField(max_length=20, choices=Outcome, default=Outcome.AWAITING)
    self_score = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    debrief_notes = models.TextField(blank=True)

    objects = InterviewQuerySet.as_manager()

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f'{self.get_interview_type_display()} with {self.application.company_name}'
