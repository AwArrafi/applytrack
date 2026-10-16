from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class ForgivingPaginator(Paginator):
    """A page number past the end shows the last page instead of a 404, e.g. after deleting
    the only item on the last page."""

    def validate_number(self, number):
        try:
            return super().validate_number(number)
        except PageNotAnInteger:
            return 1
        except EmptyPage:
            return max(1, min(int(number), self.num_pages))


class StandardPagination(PageNumberPagination):
    django_paginator_class = ForgivingPaginator
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        # page and pages let the frontend draw "Page 2 of 5" without parsing the next/previous URLs.
        return Response({
            'count': self.page.paginator.count,
            'page': self.page.number,
            'pages': self.page.paginator.num_pages,
            'results': data,
        })
