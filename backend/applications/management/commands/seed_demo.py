from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import User
from applications.models import Application, Interview

# (company, title, applied days ago or None, status, salary min, max, currency, location,
#  work arrangement, last updated days ago, notes)
APPLICATIONS = [
    ('Linear', 'Senior Frontend Engineer', 15, 'interview', 160000, 190000, 'USD', 'Remote (US)', 'remote', 1,
     'Referred by a former teammate. Strong focus on performance.'),
    ('Stripe', 'Software Engineer, Payments', 7, 'screening', 170000, 210000, 'USD', 'Seattle, WA', 'hybrid', 2, ''),
    ('Vercel', 'Full-Stack Engineer', 35, 'offer', 150000, 175000, 'USD', 'Remote (Americas)', 'remote', 3,
     'Offer deadline next week. Ask about equity refresh schedule.'),
    ('Figma', 'Product Engineer', 4, 'applied', None, None, 'USD', 'San Francisco, CA', 'hybrid', 4, ''),
    ('Datadog', 'Software Engineer II', 23, 'interview', 140000, 165000, 'USD', 'New York, NY', 'hybrid', 5, ''),
    ('Shopify', 'Senior Developer', 2, 'applied', 155000, 185000, 'CAD', 'Remote (Canada)', 'remote', 2, ''),
    ('Airtable', 'Software Engineer, Platform', None, 'wishlist', None, None, 'USD', 'San Francisco, CA', 'hybrid', 1,
     'Wait for the new-grad-to-mid team posting.'),
    ('Atlassian', 'Software Engineer', 13, 'screening', 135000, 160000, 'USD', 'Remote (US)', 'remote', 6, ''),
    ('Plaid', 'Full-Stack Engineer', 6, 'applied', 150000, 180000, 'USD', 'New York, NY', 'hybrid', 6, ''),
    ('Canva', 'Frontend Engineer', 11, 'applied', 140000, 165000, 'AUD', 'Sydney, Australia', 'hybrid', 11, ''),
    ('Supabase', 'Developer Experience Engineer', None, 'wishlist', None, None, 'USD', 'Remote', 'remote', 8, ''),
    ('Asana', 'Software Engineer', 31, 'rejected', 145000, 170000, 'USD', 'San Francisco, CA', 'onsite', 12,
     'Rejected after the technical round. Practice system design.'),
    ('Notion', 'Frontend Engineer', 41, 'rejected', None, None, 'USD', 'New York, NY', 'onsite', 19, ''),
    ('GitLab', 'Backend Engineer', 38, 'withdrawn', 130000, 150000, 'USD', 'Remote', 'remote', 24,
     'Withdrew to focus on frontend-leaning roles.'),
]

# (company, type, days from today, hour, minute, minutes, location, preparation notes)
INTERVIEWS = [
    ('Linear', 'hr_interview', -11, 13, 0, 30, '', 'Walk through recent projects.'),
    ('Vercel', 'final_interview', -12, 15, 0, 60, '', ''),
    ('Asana', 'skills_test', -14, 10, 0, 60, '', 'Practice system design.'),
    ('Stripe', 'hr_interview', 1, 11, 30, 30, '', 'Review the payments API docs and why Stripe.'),
    ('Linear', 'skills_test', 2, 14, 0, 90, '', 'Pair-programming in React. Brush up on rendering performance.'),
    ('Datadog', 'user_interview', 4, 10, 0, 240, '620 8th Ave, New York, NY',
     'Four rounds: coding, system design, behavioral, team match.'),
    ('Atlassian', 'psychotest', 7, 16, 0, 30, '', ''),
    ('Linear', 'final_interview', 9, 9, 30, 45, '', 'Prepare STAR stories about cross-team projects.'),
]


class Command(BaseCommand):
    help = "Give one account sample applications and interviews, dated relative to today."

    def add_arguments(self, parser):
        parser.add_argument('email', help='The account to fill; it must exist and have no applications yet.')

    def handle(self, *args, email, **options):
        user = User.objects.filter(email=email.lower()).first()
        if user is None:
            raise CommandError(f'No account with the email {email}.')
        if Application.objects.owned_by(user).exists():
            raise CommandError(f'{email} already has applications; seed_demo only fills an empty account.')

        today = timezone.localdate()
        by_company = {}
        for (company, title, applied_ago, status, salary_min, salary_max, currency, location,
             arrangement, updated_ago, notes) in APPLICATIONS:
            app = Application.objects.create(
                user=user, company_name=company, job_title=title, status=status, notes=notes,
                application_date=None if applied_ago is None else today - timedelta(days=applied_ago),
                salary_min=salary_min, salary_max=salary_max, salary_currency=currency,
                location=location, work_arrangement=arrangement,
                job_url=f'https://careers.example.com/{company.lower()}',
            )
            # auto_now sets updated_at to now on save, so backdate it with an update.
            Application.objects.filter(pk=app.pk).update(
                updated_at=timezone.make_aware(datetime.combine(today - timedelta(days=updated_ago), time(9)))
            )
            by_company[company] = app

        for company, kind, days, hour, minute, minutes, location, notes in INTERVIEWS:
            Interview.objects.create(
                application=by_company[company], interview_type=kind, duration_minutes=minutes,
                scheduled_at=timezone.make_aware(datetime.combine(today + timedelta(days=days), time(hour, minute))),
                location=location, preparation_notes=notes,
                meeting_url='' if location else f'https://meet.example.com/{company.lower()}-{kind}',
            )

        # Debriefs for the interviews that already happened.
        debriefs = {
            'Linear': ('passed', 4, 'Good rapport with the recruiter; moved to the technical round.'),
            'Vercel': ('passed', 5, 'Final round went well; offer followed two days later.'),
            'Asana': ('not_selected', 2, 'Struggled with the caching part of the system design question.'),
        }
        for company, (outcome, score, notes) in debriefs.items():
            Interview.objects.filter(application=by_company[company], scheduled_at__lt=timezone.now()).update(
                outcome=outcome, self_score=score, debrief_notes=notes, interviewer='Hiring team'
            )

        self.stdout.write(self.style.SUCCESS(
            f'Added {len(APPLICATIONS)} applications and {len(INTERVIEWS)} interviews.'
        ))
