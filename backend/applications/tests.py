from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.utils import timezone

from rest_framework.test import APITestCase

from .models import Application, Interview


def make_application(**fields):
    defaults = {'company_name': 'Acme', 'job_title': 'Engineer', 'application_date': date(2026, 10, 1)}
    return Application.objects.create(**(defaults | fields))


class ApplicationApiTests(APITestCase):
    def setUp(self):
        self.stripe = make_application(
            company_name='Stripe', status='interview', application_date=date(2026, 10, 5)
        )
        self.airtable = make_application(
            company_name='airtable', status='wishlist', application_date=None
        )
        self.linear = make_application(
            company_name='Linear', notes='Referred by Sam', location='Remote',
            application_date=date(2026, 9, 20),
        )
        # auto_now gives near-identical timestamps here; pin them to test the order.
        for day, app in [(2, self.stripe), (9, self.airtable), (10, self.linear)]:
            Application.objects.filter(pk=app.pk).update(updated_at=datetime(2026, 10, day, tzinfo=dt_timezone.utc))

    def names(self, response):
        self.assertEqual(response.status_code, 200)
        return [row['company_name'] for row in response.json()]

    def test_list_newest_update_first(self):
        self.assertEqual(self.names(self.client.get('/api/applications/')), ['Linear', 'airtable', 'Stripe'])

    def test_search_is_case_insensitive_and_covers_notes(self):
        self.assertEqual(self.names(self.client.get('/api/applications/?q=STRIPE')), ['Stripe'])
        self.assertEqual(self.names(self.client.get('/api/applications/?q=sam')), ['Linear'])

    def test_status_filter_and_unknown_status_ignored(self):
        self.assertEqual(self.names(self.client.get('/api/applications/?status=wishlist')), ['airtable'])
        self.assertEqual(len(self.names(self.client.get('/api/applications/?status=hacked'))), 3)

    def test_sort_by_applied_puts_wishlist_last(self):
        self.assertEqual(
            self.names(self.client.get('/api/applications/?sort=applied')), ['Stripe', 'Linear', 'airtable']
        )

    def test_sort_by_company_ignores_case(self):
        self.assertEqual(
            self.names(self.client.get('/api/applications/?sort=company')), ['airtable', 'Linear', 'Stripe']
        )

    def test_create_returns_frontend_shape(self):
        response = self.client.post(
            '/api/applications/',
            {'company_name': 'Vercel', 'job_title': 'Engineer', 'status': 'applied', 'work_arrangement': 'remote'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['salary_currency'], 'USD')
        self.assertIn('updated_at', body)
        self.assertEqual(body['application_date'], timezone.localdate().isoformat())

    def test_create_wishlist_has_no_application_date(self):
        response = self.client.post(
            '/api/applications/', {'company_name': 'X', 'job_title': 'Y', 'status': 'wishlist'}, format='json'
        )
        self.assertIsNone(response.json()['application_date'])

    def test_rejects_invalid_input(self):
        bad = [
            {'company_name': 'X', 'job_title': 'Y', 'status': 'hired'},
            {'company_name': 'X', 'job_title': 'Y', 'salary_min': 200, 'salary_max': 100},
            {'company_name': '', 'job_title': 'Y'},
        ]
        for payload in bad:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post('/api/applications/', payload, format='json').status_code, 400)

    def test_partial_update_checks_salary_against_stored_value(self):
        self.stripe.salary_max = 100
        self.stripe.save()
        response = self.client.patch(f'/api/applications/{self.stripe.id}/', {'salary_min': 200}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_deleting_application_deletes_its_interviews(self):
        Interview.objects.create(application=self.stripe, scheduled_at=datetime(2026, 10, 14, 11, tzinfo=dt_timezone.utc))
        self.assertEqual(self.client.delete(f'/api/applications/{self.stripe.id}/').status_code, 204)
        self.assertFalse(Interview.objects.exists())


class InterviewApiTests(APITestCase):
    def test_list_soonest_first_with_company_and_filter_by_application(self):
        stripe = make_application(company_name='Stripe')
        linear = make_application(company_name='Linear')
        Interview.objects.create(application=stripe, scheduled_at=datetime(2026, 10, 20, 9, tzinfo=dt_timezone.utc))
        Interview.objects.create(application=linear, scheduled_at=datetime(2026, 10, 15, 9, tzinfo=dt_timezone.utc))

        rows = self.client.get('/api/interviews/').json()
        self.assertEqual([r['company_name'] for r in rows], ['Linear', 'Stripe'])
        self.assertEqual(rows[0]['scheduled_at'], '2026-10-15T16:00:00+07:00')

        rows = self.client.get(f'/api/interviews/?application={stripe.id}').json()
        self.assertEqual([r['company_name'] for r in rows], ['Stripe'])


class DashboardApiTests(APITestCase):
    def test_summary_counts(self):
        today = timezone.localdate()
        now = timezone.now()
        stripe = make_application(company_name='Stripe', status='interview', application_date=today - timedelta(days=2))
        make_application(company_name='Linear', status='applied', application_date=today - timedelta(days=20))
        make_application(company_name='Vercel', status='offer', application_date=today - timedelta(days=30))
        make_application(company_name='Notion', status='rejected', application_date=today - timedelta(days=40))
        make_application(company_name='Airtable', status='wishlist', application_date=None)
        Interview.objects.create(application=stripe, scheduled_at=now - timedelta(days=1))  # past: not counted
        Interview.objects.create(application=stripe, scheduled_at=now + timedelta(days=1))
        Interview.objects.create(application=stripe, scheduled_at=now + timedelta(days=10))

        body = self.client.get('/api/dashboard/').json()

        self.assertEqual(body['today'], today.isoformat())
        self.assertEqual(body['total_applications'], 5)
        self.assertEqual(body['active_applications'], 2)
        self.assertEqual(body['active_company_count'], 2)
        self.assertEqual(body['offer_count'], 1)
        self.assertEqual(body['applied_last_7_days'], 1)
        # 4 submitted (wishlist excluded); interview, offer, rejected answered.
        self.assertEqual(body['response_rate'], 75)
        self.assertEqual(body['status_counts']['wishlist'], 1)
        self.assertEqual(body['upcoming_interview_count'], 2)
        self.assertEqual(body['interviews_this_week'], 1)
        self.assertEqual(body['upcoming_interviews'][0]['company_name'], 'Stripe')
        self.assertEqual(len(body['recent_applications']), 5)

        weeks = body['weekly_activity']
        self.assertEqual(len(weeks), 5)
        self.assertEqual(weeks[-1]['week_start'], (today - timedelta(days=6)).isoformat())
        self.assertEqual([w['submitted'] for w in weeks], [1, 0, 1, 0, 1])  # days -30, -20, -2; -40 is out of range

    def test_empty_database(self):
        body = self.client.get('/api/dashboard/').json()
        self.assertEqual(body['total_applications'], 0)
        self.assertEqual(body['response_rate'], 0)
