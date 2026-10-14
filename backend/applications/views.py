from datetime import timedelta

from django.db.models import Count, F, Q
from django.db.models.functions import Lower
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Application, Interview
from .serializers import ApplicationSerializer, InterviewSerializer

# Same sort options as the frontend's Applications page.
SORT_ORDERS = {
    'updated': ['-updated_at'],
    'applied': [F('application_date').desc(nulls_last=True), '-updated_at'],
    'company': [Lower('company_name')],
}


# shortcut: no authentication and no pagination, fine for one person on localhost;
# add auth before deploying anywhere public, and pagination past a few hundred rows.
class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD for applications. List supports ?q=, ?status= and ?sort=."""

    serializer_class = ApplicationSerializer

    def get_queryset(self):
        queryset = Application.objects.all()
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


class InterviewViewSet(viewsets.ModelViewSet):
    """CRUD for interviews, soonest first. List supports ?application=<id>."""

    serializer_class = InterviewSerializer

    def get_queryset(self):
        queryset = Interview.objects.select_related('application')
        application = self.request.query_params.get('application')
        if self.action == 'list' and application and application.isdigit():
            queryset = queryset.filter(application_id=application)
        return queryset


Status = Application.Status
ACTIVE_STATUSES = [Status.APPLIED, Status.SCREENING, Status.INTERVIEW]
# The company has answered a submitted application.
RESPONDED_STATUSES = [Status.SCREENING, Status.INTERVIEW, Status.OFFER, Status.REJECTED]


class DashboardView(APIView):
    """All numbers the dashboard page shows, in one response."""

    def get(self, request):
        now = timezone.localtime()
        today = now.date()
        applications = Application.objects.all()

        status_counts = dict.fromkeys(Status.values, 0)
        for row in applications.values('status').annotate(count=Count('id')):
            status_counts[row['status']] = row['count']
        total = sum(status_counts.values())
        submitted = total - status_counts[Status.WISHLIST]
        responded = sum(status_counts[s] for s in RESPONDED_STATUSES)
        active = applications.filter(status__in=ACTIVE_STATUSES)
        upcoming = Interview.objects.select_related('application').filter(scheduled_at__gte=now)

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
            'weekly_activity': weekly_activity(today, weeks=5),
        })


def weekly_activity(today, weeks):
    """Applications sent and responses received per week, oldest week first, the last ending today.

    The updated_at of a responded application stands in for its response date.
    shortcut: approximate, upgrade by storing a status history if the chart needs to be exact.
    """
    result = []
    for weeks_back in range(weeks - 1, -1, -1):
        start = today - timedelta(days=7 * weeks_back + 6)
        end = start + timedelta(days=6)
        result.append({
            'week_start': start.isoformat(),
            'submitted': Application.objects.filter(application_date__range=(start, end)).count(),
            'responses': Application.objects.filter(
                status__in=RESPONDED_STATUSES, updated_at__date__range=(start, end)
            ).count(),
        })
    return result
