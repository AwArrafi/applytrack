from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from django.core.exceptions import ImproperlyConfigured


def database_from_url(url, sqlite_path: Path):
    """DATABASE_URL -> Django's DATABASES['default'].

    "postgres://user:password@host:5432/name?sslmode=require" in production; empty means
    the local SQLite file, so development needs no database server.
    """
    if not url:
        return {'ENGINE': 'django.db.backends.sqlite3', 'NAME': sqlite_path}

    parts = urlsplit(url)
    if parts.scheme not in ('postgres', 'postgresql'):
        raise ImproperlyConfigured(f'DATABASE_URL must start with postgres://, not {parts.scheme}://')
    options = {key: values[-1] for key, values in parse_qs(parts.query).items()}
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(parts.path.lstrip('/')),
        'USER': unquote(parts.username or ''),
        'PASSWORD': unquote(parts.password or ''),
        'HOST': parts.hostname or '',
        'PORT': str(parts.port or ''),
        'OPTIONS': options,
        # Reuse connections between requests instead of opening one per request.
        'CONN_MAX_AGE': 60,
        'CONN_HEALTH_CHECKS': True,
    }
