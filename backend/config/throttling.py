"""Rate limits per visitor, not per Next.js server.

The browser never calls Django: the Next.js server does, so every anonymous request arrives from
the same few server IPs. Next.js passes the visitor's IP in X-Client-IP together with
FRONTEND_PROXY_SECRET; only then is that IP trusted (anyone can send the header, nobody else
has the secret).
"""

import hmac

from django.conf import settings
from rest_framework import throttling


class ClientIpMixin:
    def get_ident(self, request):
        secret = settings.FRONTEND_PROXY_SECRET
        client_ip = request.headers.get('X-Client-IP', '').strip()
        given = request.headers.get('X-Frontend-Secret', '')
        if secret and client_ip and hmac.compare_digest(given.encode(), secret.encode()):
            return client_ip[:64]
        return super().get_ident(request)


class AnonRateThrottle(ClientIpMixin, throttling.AnonRateThrottle):
    pass


class ScopedRateThrottle(ClientIpMixin, throttling.ScopedRateThrottle):
    pass
