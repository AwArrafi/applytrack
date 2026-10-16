from django.utils import timezone


class UserTimeZoneMiddleware:
    """Ends every request in the default time zone.

    The signed-in user's time zone is switched on during authentication (accounts/authentication.py).
    Django keeps it per thread, so without this reset the next request on the same worker thread,
    possibly another user's, would start in the wrong time zone.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        timezone.deactivate()
        try:
            return self.get_response(request)
        finally:
            timezone.deactivate()
