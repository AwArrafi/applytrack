"""Per-account sign-in lock, shared by the app's sign-in and the Django admin's. On top of the
per-visitor rate limits: someone guessing one account's password from many IP addresses is stopped
too. Counted for any email, registered or not, so it reveals nothing."""

import hashlib

from django.core.cache import cache
from django.utils.translation import gettext_lazy as _

MAX_FAILED_LOGINS = 5
FAILED_LOGIN_WINDOW = 15 * 60  # seconds, from the first failure
LOCKED_MESSAGE = _('Too many failed sign-in attempts for this account. Try again in 15 minutes.')


def _key(email):
    # Hashed: the raw input could be any length or characters, cache keys can't.
    return 'failed-logins:' + hashlib.sha256(email.strip().lower().encode()).hexdigest()


def is_locked(email):
    return cache.get(_key(email), 0) >= MAX_FAILED_LOGINS


def record_failure(email):
    key = _key(email)
    cache.add(key, 0, FAILED_LOGIN_WINDOW)
    cache.incr(key)


def clear_failures(email):
    cache.delete(_key(email))
