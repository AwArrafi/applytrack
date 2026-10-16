"""Numbers for the Analytics page. Everything is scoped to one user and, where it says so,
to the applications they submitted in the chosen period (the "cohort")."""

from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone

from .models import Application, Interview, StatusChange

Status = Application.Status
Type = Interview.Type

# The company answered: anything past "applied", or an interview was scheduled.
RESPONDED_STATUSES = [Status.SCREENING, Status.INTERVIEW, Status.OFFER, Status.REJECTED]
# Hiring steps after the CV screening, before the last round.
ASSESSMENT_TYPES = [Type.USER_INTERVIEW, Type.SKILLS_TEST, Type.PSYCHOTEST, Type.GROUP_DISCUSSION]
FUNNEL_STAGES = ['submitted', 'screening', 'assessment', 'final', 'offer']
# Applied this many days ago with no answer yet: worth a polite follow-up.
FOLLOW_UP_AFTER_DAYS = 5
WEEKS = 6


def ever_status(statuses):
    return Exists(StatusChange.objects.filter(application=OuterRef('pk'), to_status__in=statuses))


def has_interview(types=None):
    interviews = Interview.objects.filter(application=OuterRef('pk'))
    return Exists(interviews.filter(interview_type__in=types) if types else interviews)


def with_stages(applications):
    """Annotates how far each application got. A later stage implies the earlier ones, so an
    application that went straight to "offer" still counts as having passed the CV screening."""
    offer = ever_status([Status.OFFER])
    final = offer | has_interview([Type.FINAL_INTERVIEW])
    assessment = final | ever_status([Status.INTERVIEW]) | has_interview(ASSESSMENT_TYPES)
    # A rejection straight from "applied" doesn't count as passing the CV screening.
    screening = assessment | ever_status([Status.SCREENING]) | has_interview()
    return applications.annotate(
        got_screening=screening,
        got_assessment=assessment,
        got_final=final,
        got_offer=offer,
        got_response=ever_status(RESPONDED_STATUSES) | has_interview(),
    )


def stage_counts(cohort):
    return with_stages(cohort).aggregate(
        submitted=Count('pk'),
        screening=Count('pk', filter=Q(got_screening=True)),
        assessment=Count('pk', filter=Q(got_assessment=True)),
        final=Count('pk', filter=Q(got_final=True)),
        offer=Count('pk', filter=Q(got_offer=True)),
        responded=Count('pk', filter=Q(got_response=True)),
    )


def percent(part, whole):
    return round(part / whole * 100, 1) if whole else 0.0


def build_analytics(user, days):
    """days: 30, 90, or None for all time."""
    today = timezone.localdate()
    submitted = Application.objects.owned_by(user).exclude(application_date=None)
    if days:
        start = today - timedelta(days=days - 1)
        cohort = submitted.filter(application_date__range=(start, today))
        previous = submitted.filter(application_date__range=(start - timedelta(days=days), start - timedelta(days=1)))
    else:
        start, cohort, previous = None, submitted, None

    counts = stage_counts(cohort)
    before = stage_counts(previous) if previous is not None else None

    def kpi(key, with_rate=True):
        """This period's number, the previous period's (None for all time), and its share of submitted."""
        return {
            'value': counts[key],
            'previous': before[key] if before else None,
            'rate': percent(counts[key], counts['submitted']) if with_rate else None,
        }

    return {
        'today': today.isoformat(),
        'period': {'days': days, 'start': start.isoformat() if start else None},
        'kpis': {
            'applications': kpi('submitted', with_rate=False) | {'per_day': round(counts['submitted'] / days, 1) if days else None},
            'interviews': kpi('assessment'),
            'offers': kpi('offer'),
            'responses': kpi('responded') | {'avg_days': first_response_days(cohort)},
        },
        'funnel': [{'stage': stage, 'count': counts[stage]} for stage in FUNNEL_STAGES],
        'weekly': weekly_activity(user, today),
        'channels': channels(cohort),
        'status_counts': status_counts(user),
        'response_times': response_times(cohort),
        'follow_up': follow_up(user, today),
    }


def first_response_days(cohort):
    """Average days from applying to the company's first answer."""
    waits = []
    first_answers = (
        StatusChange.objects.filter(application__in=cohort, to_status__in=RESPONDED_STATUSES)
        .order_by('application_id', 'changed_at')
        .values_list('application_id', 'changed_at', 'application__application_date')
    )
    seen = set()
    for app_id, changed_at, applied_on in first_answers:
        if app_id not in seen:
            seen.add(app_id)
            waits.append((timezone.localdate(changed_at) - applied_on).days)
    return round(sum(waits) / len(waits), 1) if waits else None


def weekly_activity(user, today):
    """Applications sent and answers received per week; the last week ends today. Answers are
    real status changes now, not the dashboard's estimate."""
    applications = Application.objects.owned_by(user)
    answers = StatusChange.objects.filter(application__user=user, to_status__in=RESPONDED_STATUSES)
    weeks = []
    for weeks_back in range(WEEKS - 1, -1, -1):
        start = today - timedelta(days=7 * weeks_back + 6)
        end = start + timedelta(days=6)
        weeks.append({
            'week_start': start.isoformat(),
            'submitted': applications.filter(application_date__range=(start, end)).count(),
            'responses': answers.filter(changed_at__date__range=(start, end)).count(),
        })
    return weeks


def channels(cohort):
    rows = (
        with_stages(cohort).values('source')
        .annotate(
            applications=Count('pk'),
            interviews=Count('pk', filter=Q(got_assessment=True)),
            offers=Count('pk', filter=Q(got_offer=True)),
            responses=Count('pk', filter=Q(got_response=True)),
        )
        .order_by('-applications', 'source')
    )
    return [row | {'response_rate': percent(row['responses'], row['applications'])} for row in rows]


def status_counts(user):
    """Where every application stands now (all of them, not only this period's)."""
    counts = dict.fromkeys(Status.values, 0)
    for row in Application.objects.owned_by(user).values('status').annotate(count=Count('pk')):
        counts[row['status']] = row['count']
    return counts


def response_times(cohort):
    """Average days an application waits in a stage before the next answer, from the status history.
    "offer" is the wait before an offer arrived, whatever stage it came from."""
    waits = defaultdict(list)
    changes = StatusChange.objects.filter(application__in=cohort).order_by('application_id', 'changed_at')
    previous = None
    for change in changes:
        if previous is not None and previous.application_id == change.application_id:
            days = (change.changed_at - previous.changed_at).total_seconds() / 86400
            if previous.to_status in (Status.APPLIED, Status.SCREENING, Status.INTERVIEW):
                waits[previous.to_status].append(days)
            if change.to_status == Status.OFFER:
                waits['offer'].append(days)
        previous = change
    return [
        {'stage': stage, 'avg_days': round(sum(waits[stage]) / len(waits[stage]), 1) if waits[stage] else None,
         'samples': len(waits[stage])}
        for stage in [Status.APPLIED, Status.SCREENING, Status.INTERVIEW, 'offer']
    ]


def follow_up(user, today):
    """Applications still at "applied" after FOLLOW_UP_AFTER_DAYS days."""
    count = Application.objects.owned_by(user).filter(
        status=Status.APPLIED, application_date__lte=today - timedelta(days=FOLLOW_UP_AFTER_DAYS)
    ).count()
    return {'count': count, 'after_days': FOLLOW_UP_AFTER_DAYS}
