from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """For the host's health checks: 200 when the app runs. Add ?db=1 to also check the database;
    the default leaves it alone, so frequent checks don't keep a scale-to-zero database (Neon) awake."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []  # the host polls this; it must never get a 429

    def get(self, request):
        if request.query_params.get('db'):
            connection.ensure_connection()  # raises (-> 500) when the database is down
        return Response({'status': 'ok'})
