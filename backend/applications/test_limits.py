from datetime import date, datetime, timezone as dt_timezone
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.throttling import SimpleRateThrottle

from .analytics import weekly_counts
from .test_inbound import SECRET, raw_email
from .tests import JOBSTREET_APPLIED, SignedInTestCase

# DRF reads the rates once at import, so tests patch the shared dict instead of the settings.
RATES = SimpleRateThrottle.THROTTLE_RATES


class RateLimitTests(SignedInTestCase):
    def test_signed_in_user_hits_the_general_limit(self):
        with mock.patch.dict(RATES, {'user': '2/minute'}):
            codes = [self.client.get('/api/applications/').status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])

    def test_import_email_has_its_own_stricter_limit(self):
        with mock.patch.dict(RATES, {'import': '1/minute'}):
            first = self.client.post('/api/applications/import-email/', {'text': JOBSTREET_APPLIED}, format='json')
            second = self.client.post('/api/applications/import-email/', {'text': JOBSTREET_APPLIED}, format='json')
            other_page = self.client.get('/api/applications/')
        self.assertEqual((first.status_code, second.status_code, other_page.status_code), (200, 429, 200))

    @override_settings(INBOUND_EMAIL_DOMAIN='inbound.example', INBOUND_EMAIL_SECRET=SECRET)
    def test_mail_provider_and_health_check_are_never_limited(self):
        self.client.force_authenticate(None)
        with mock.patch.dict(RATES, {'anon': '1/minute'}):
            for n in range(3):
                inbound = self.client.generic(
                    'POST', '/api/inbound-email/', raw_email(JOBSTREET_APPLIED, message_id=f'<{n}@x>'),
                    content_type='message/rfc822', HTTP_AUTHORIZATION=f'Bearer {SECRET}',
                    HTTP_X_ENVELOPE_TO=f'{self.user.inbound_token}@inbound.example',
                )
                self.assertNotEqual(inbound.status_code, 429)
                self.assertEqual(self.client.get('/api/health/').status_code, 200)


class WeeklyCountsTests(TestCase):
    @override_settings(TIME_ZONE='Asia/Jakarta')
    def test_dates_land_in_their_week_and_outside_dates_are_ignored(self):
        today = date(2026, 10, 17)  # two weeks: Oct 4–10 and Oct 11–17
        submitted = [date(2026, 10, 3), date(2026, 10, 4), date(2026, 10, 10), date(2026, 10, 11), date(2026, 10, 17)]
        # 20:00 UTC on Oct 10 is already Oct 11 in Jakarta: the second week.
        answers = [datetime(2026, 10, 10, 20, tzinfo=dt_timezone.utc)]
        self.assertEqual(weekly_counts(today, 2, submitted, answers), [
            {'week_start': '2026-10-04', 'submitted': 2, 'responses': 0},
            {'week_start': '2026-10-11', 'submitted': 2, 'responses': 1},
        ])
