from datetime import date, timedelta

from django.db.models import Count, F, Q
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .models import Application, Interview
from .analytics import build_analytics, weekly_counts
from .email_import import import_email as apply_portal_email
from .pagination import StandardPagination
from .serializers import ApplicationSerializer, InterviewSerializer

# Same sort options as the frontend's Applications page.
SORT_ORDERS = {
    'updated': ['-updated_at'],
    'applied': [F('application_date').desc(nulls_last=True), '-updated_at'],
    'company': [Lower('company_name')],
}


class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD for applications. List is paginated (?page=, ?page_size=) and supports ?q=, ?status=, ?sort=."""

    serializer_class = ApplicationSerializer
    pagination_class = StandardPagination
    throttle_scope = 'import'  # only used by import-email, the one action with ScopedRateThrottle

    def get_queryset(self):
        queryset = Application.objects.owned_by(self.request.user)
        if self.action != 'list':
            return queryset

        params = self.request.query_params
        q = params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(company_name__icontains=q)
                | Q(job_title__icontains=q)
                | Q(location__icontains=q)
                | Q(notes__icontains=q)
            )
        status = params.get('status')
        if status in Application.Status.values:
            queryset = queryset.filter(status=status)
        return queryset.order_by(*SORT_ORDERS.get(params.get('sort'), SORT_ORDERS['updated']))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='import-email',
            throttle_classes=[UserRateThrottle, ScopedRateThrottle])
    def import_email(self, request):
        """Adds or updates an application from a job portal email's text (e.g. JobStreet's)."""
        text = request.data.get('text')
        if not isinstance(text, str) or not text.strip() or len(text) > 50_000:
            raise ValidationError({'text': [_('Paste the full text of the email.')]})
        result, application = apply_portal_email(request.user, text)
        if result is None:
            raise ValidationError({'text': [_('This email is not one ApplyTrack recognises yet.')]})
        return Response({'result': result, 'application': ApplicationSerializer(application).data})

    @action(detail=False)
    def choices(self, request):
        """Every application as id, company and role, for the interview form's dropdown.

        shortcut: not paginated (three short fields per row); turn the dropdown into a search box
        if accounts start having more than a few hundred applications.
        """
        rows = Application.objects.owned_by(request.user).order_by(Lower('company_name'))
        return Response(list(rows.values('id', 'company_name', 'job_title')))


# A calendar month view spans at most 6 weeks; a little more leaves room for other views.
MAX_RANGE_DAYS = 62


class InterviewViewSet(viewsets.ModelViewSet):
    """CRUD for interviews, soonest first.

    List filters: ?application=<id>, ?when=upcoming|past (past is newest first), and
    ?from=YYYY-MM-DD&to=YYYY-MM-DD (local dates, at most MAX_RANGE_DAYS apart). A date range
    comes back whole, for the calendar; any other list is paginated.
    """

    serializer_class = InterviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Interview.objects.owned_by(self.request.user).select_related('application')
        if self.action != 'list':
            return queryset

        params = self.request.query_params
        application = params.get('application')
        if application and application.isdigit():
            queryset = queryset.filter(application_id=application)
        when = params.get('when')
        if when == 'upcoming':
            queryset = queryset.filter(scheduled_at__gte=timezone.now())
        elif when == 'past':
            queryset = queryset.filter(scheduled_at__lt=timezone.now()).order_by('-scheduled_at')
        date_range = self.date_range()
        if date_range:
            queryset = queryset.filter(scheduled_at__date__range=date_range)
        return queryset

    def date_range(self):
        params = self.request.query_params
        if 'from' not in params and 'to' not in params:
            return None
        try:
            start, end = date.fromisoformat(params.get('from', '')), date.fromisoformat(params.get('to', ''))
        except ValueError:
            raise ValidationError({'from': [_('Give both from and to as YYYY-MM-DD dates.')]})
        if end < start or (end - start).days > MAX_RANGE_DAYS:
            raise ValidationError({'to': [_('The date range must run forwards and span at most 62 days.')]})
        return start, end

    def paginate_queryset(self, queryset):
        # A date range is already bounded, and the calendar needs all of it.
        if self.date_range():
            return None
        return super().paginate_queryset(queryset)


Status = Application.Status
ACTIVE_STATUSES = [Status.APPLIED, Status.SCREENING, Status.INTERVIEW]
# The company has answered a submitted application.
RESPONDED_STATUSES = [Status.SCREENING, Status.INTERVIEW, Status.OFFER, Status.REJECTED]


class DashboardView(APIView):
    """All numbers the dashboard page shows, in one response."""

    def get(self, request):
        now = timezone.localtime()
        today = now.date()
        applications = Application.objects.owned_by(request.user)

        status_counts = dict.fromkeys(Status.values, 0)
        for row in applications.values('status').annotate(count=Count('id')):
            status_counts[row['status']] = row['count']
        total = sum(status_counts.values())
        submitted = total - status_counts[Status.WISHLIST]
        responded = sum(status_counts[s] for s in RESPONDED_STATUSES)
        active = applications.filter(status__in=ACTIVE_STATUSES)
        upcoming = Interview.objects.owned_by(request.user).select_related('application').filter(scheduled_at__gte=now)

        return Response({
            'today': today.isoformat(),
            'total_applications': total,
            'active_applications': active.count(),
            'active_company_count': active.values('company_name').distinct().count(),
            'upcoming_interview_count': upcoming.count(),
            'interviews_this_week': upcoming.filter(scheduled_at__date__lt=today + timedelta(days=7)).count(),
            'offer_count': status_counts[Status.OFFER],
            'applied_last_7_days': applications.filter(application_date__gt=today - timedelta(days=7)).count(),
            'response_rate': round(responded / submitted * 100) if submitted else 0,
            'status_counts': status_counts,
            'upcoming_interviews': InterviewSerializer(upcoming[:4], many=True).data,
            'recent_applications': ApplicationSerializer(applications.order_by('-updated_at')[:6], many=True).data,
            'weekly_activity': weekly_activity(applications, today, weeks=5),
        })


def weekly_activity(applications, today, weeks):
    """Applications sent and responses received per week, oldest week first, the last ending today.

    The updated_at of a responded application stands in for its response date.
    shortcut: approximate, upgrade by storing a status history if the chart needs to be exact.
    """
    start = today - timedelta(days=7 * weeks - 1)
    return weekly_counts(
        today, weeks,
        applications.filter(application_date__range=(start, today)).values_list('application_date', flat=True),
        applications.filter(status__in=RESPONDED_STATUSES, updated_at__date__gte=start)
        .values_list('updated_at', flat=True),
    )


# Periods the Analytics page offers; anything else falls back to the default.
ANALYTICS_PERIODS = {'30': 30, '90': 90, 'all': None}


class AnalyticsView(APIView):
    """Everything on the Analytics page. ?period=30 (default), 90, or all."""

    def get(self, request):
        days = ANALYTICS_PERIODS.get(request.query_params.get('period', '30'), 30)
        return Response(build_analytics(request.user, days))
