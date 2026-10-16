from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.test import override_settings
from django.utils import timezone

from rest_framework.test import APITestCase

from accounts.models import User

from .models import Application, Interview, StatusChange


# Tests only: the real (deliberately slow) password hasher would make every test take seconds.
@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SignedInTestCase(APITestCase):
    """API tests run as a signed-in user, who owns the data the test creates."""

    def setUp(self):
        self.user = User.objects.create_user('owner@example.com', 'a-strong-pass-123')
        self.client.force_authenticate(self.user)

    def make_application(self, user=None, **fields):
        defaults = {'user': user or self.user, 'company_name': 'Acme', 'job_title': 'Engineer',
                    'application_date': date(2026, 10, 1)}
        return Application.objects.create(**(defaults | fields))


class ApplicationApiTests(SignedInTestCase):
    def setUp(self):
        super().setUp()
        self.stripe = self.make_application(
            company_name='Stripe', status='interview', application_date=date(2026, 10, 5)
        )
        self.airtable = self.make_application(
            company_name='airtable', status='wishlist', application_date=None
        )
        self.linear = self.make_application(
            company_name='Linear', notes='Referred by Sam', location='Remote',
            application_date=date(2026, 9, 20),
        )
        # auto_now gives near-identical timestamps here; pin them to test the order.
        for day, app in [(2, self.stripe), (9, self.airtable), (10, self.linear)]:
            Application.objects.filter(pk=app.pk).update(updated_at=datetime(2026, 10, day, tzinfo=dt_timezone.utc))

    def names(self, response):
        self.assertEqual(response.status_code, 200)
        return [row['company_name'] for row in response.json()['results']]

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

    def test_error_messages_follow_accept_language(self):
        def errors(payload, **headers):
            return self.client.post('/api/applications/', payload, format='json', **headers).json()

        salary = {'company_name': 'X', 'job_title': 'Y', 'salary_min': 200, 'salary_max': 100}
        blank = {'company_name': '', 'job_title': 'Y'}
        # Indonesian is the default.
        self.assertEqual(errors(salary)['salary_max'], ['Harus sama dengan atau lebih besar dari gaji minimum.'])
        self.assertNotIn('blank', errors(blank)['company_name'][0])
        en = {'HTTP_ACCEPT_LANGUAGE': 'en'}
        self.assertEqual(errors(salary, **en)['salary_max'], ['Must be at least the minimum salary.'])
        self.assertEqual(errors(blank, **en)['company_name'], ['This field may not be blank.'])

    def test_partial_update_checks_salary_against_stored_value(self):
        self.stripe.salary_max = 100
        self.stripe.save()
        response = self.client.patch(f'/api/applications/{self.stripe.id}/', {'salary_min': 200}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_deleting_application_deletes_its_interviews(self):
        Interview.objects.create(application=self.stripe, scheduled_at=datetime(2026, 10, 14, 11, tzinfo=dt_timezone.utc))
        self.assertEqual(self.client.delete(f'/api/applications/{self.stripe.id}/').status_code, 204)
        self.assertFalse(Interview.objects.exists())


@override_settings(TIME_ZONE='Asia/Jakarta')  # assertions below expect +07:00
class InterviewApiTests(SignedInTestCase):
    def test_list_soonest_first_with_company_and_filter_by_application(self):
        stripe = self.make_application(company_name='Stripe')
        linear = self.make_application(company_name='Linear')
        Interview.objects.create(application=stripe, scheduled_at=datetime(2026, 10, 20, 9, tzinfo=dt_timezone.utc))
        Interview.objects.create(application=linear, scheduled_at=datetime(2026, 10, 15, 9, tzinfo=dt_timezone.utc))

        rows = self.client.get('/api/interviews/').json()['results']
        self.assertEqual([r['company_name'] for r in rows], ['Linear', 'Stripe'])
        self.assertEqual(rows[0]['scheduled_at'], '2026-10-15T16:00:00+07:00')

        rows = self.client.get(f'/api/interviews/?application={stripe.id}').json()['results']
        self.assertEqual([r['company_name'] for r in rows], ['Stripe'])


@override_settings(TIME_ZONE='Asia/Jakarta')  # assertions below expect +07:00
class InterviewWriteTests(SignedInTestCase):
    def setUp(self):
        super().setUp()
        self.app = self.make_application(company_name='Stripe')

    def post(self, **fields):
        payload = {'application': self.app.id, 'scheduled_at': '2026-10-20T14:00'} | fields
        return self.client.post('/api/interviews/', payload, format='json')

    def test_time_without_offset_means_local_time(self):
        # The form sends "2026-10-20T14:00"; it must stay 14:00 local, not shift by the UTC offset.
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['scheduled_at'], '2026-10-20T14:00:00+07:00')
        self.assertEqual(response.json()['outcome'], 'awaiting')

    def test_debrief_validation(self):
        self.assertEqual(self.post(self_score=6).status_code, 400)
        self.assertEqual(self.post(self_score=0).status_code, 400)
        self.assertEqual(self.post(outcome='great').status_code, 400)
        self.assertEqual(self.post(self_score=None, outcome='passed').status_code, 201)


class DashboardApiTests(SignedInTestCase):
    def test_summary_counts(self):
        today = timezone.localdate()
        now = timezone.now()
        stripe = self.make_application(company_name='Stripe', status='interview', application_date=today - timedelta(days=2))
        self.make_application(company_name='Linear', status='applied', application_date=today - timedelta(days=20))
        self.make_application(company_name='Vercel', status='offer', application_date=today - timedelta(days=30))
        self.make_application(company_name='Notion', status='rejected', application_date=today - timedelta(days=40))
        self.make_application(company_name='Airtable', status='wishlist', application_date=None)
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


class OwnershipTests(SignedInTestCase):
    """One user must never see or change another user's data."""

    def setUp(self):
        super().setUp()
        self.other = User.objects.create_user('other@example.com', 'a-strong-pass-123')
        self.theirs = self.make_application(user=self.other, company_name='Their Co')
        self.their_interview = Interview.objects.create(
            application=self.theirs, scheduled_at=datetime(2026, 10, 20, 9, tzinfo=dt_timezone.utc)
        )
        self.mine = self.make_application(company_name='My Co')

    def test_lists_only_show_own_data(self):
        self.assertEqual([a['company_name'] for a in self.client.get('/api/applications/').json()['results']], ['My Co'])
        self.assertEqual(self.client.get('/api/interviews/').json()['count'], 0)
        self.assertEqual([c['company_name'] for c in self.client.get('/api/applications/choices/').json()], ['My Co'])
        self.assertEqual(self.client.get('/api/dashboard/').json()['total_applications'], 1)

    def test_other_users_items_look_like_they_do_not_exist(self):
        for method, url in [
            ('get', f'/api/applications/{self.theirs.id}/'),
            ('patch', f'/api/applications/{self.theirs.id}/'),
            ('delete', f'/api/applications/{self.theirs.id}/'),
            ('get', f'/api/interviews/{self.their_interview.id}/'),
            ('delete', f'/api/interviews/{self.their_interview.id}/'),
        ]:
            with self.subTest(method=method, url=url):
                self.assertEqual(getattr(self.client, method)(url, {}, format='json').status_code, 404)
        self.assertTrue(Application.objects.filter(pk=self.theirs.pk).exists())

    def test_cannot_attach_an_interview_to_someone_elses_application(self):
        response = self.client.post(
            '/api/interviews/', {'application': self.theirs.id, 'scheduled_at': '2026-10-20T14:00'}, format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('application', response.json())

    def test_new_applications_belong_to_the_signed_in_user(self):
        response = self.client.post(
            '/api/applications/', {'company_name': 'New', 'job_title': 'Dev', 'user': self.other.id}, format='json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Application.objects.get(pk=response.json()['id']).user, self.user)

    def test_signed_out_requests_are_refused(self):
        self.client.force_authenticate(None)
        for url in ['/api/applications/', '/api/interviews/', '/api/dashboard/', '/api/auth/me/']:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)


class StatusHistoryTests(SignedInTestCase):
    def history(self, app):
        return list(StatusChange.objects.filter(application=app).values_list('from_status', 'to_status'))

    def test_creating_and_changing_status_is_recorded(self):
        response = self.client.post('/api/applications/', {'company_name': 'A', 'job_title': 'B'}, format='json')
        app = Application.objects.get(pk=response.json()['id'])
        self.assertEqual(self.history(app), [('', 'applied')])

        self.client.patch(f'/api/applications/{app.id}/', {'status': 'interview'}, format='json')
        self.client.patch(f'/api/applications/{app.id}/', {'notes': 'no status change'}, format='json')
        self.client.patch(f'/api/applications/{app.id}/', {'status': 'interview'}, format='json')
        self.assertEqual(self.history(app), [('', 'applied'), ('applied', 'interview')])


class PaginationTests(SignedInTestCase):
    def setUp(self):
        super().setUp()
        Application.objects.bulk_create(
            Application(user=self.user, company_name=f'Company {n:02}', job_title='Dev') for n in range(30)
        )

    def get(self, query):
        return self.client.get(f'/api/applications/?sort=company&{query}').json()

    def test_pages_of_25_with_count_and_page_info(self):
        first, second = self.get('page=1'), self.get('page=2')
        self.assertEqual((first['count'], first['page'], first['pages'], len(first['results'])), (30, 1, 2, 25))
        self.assertEqual([r['company_name'] for r in second['results']], [f'Company {n:02}' for n in range(25, 30)])

    def test_page_size_is_capped_and_bad_pages_fall_back(self):
        self.assertEqual(len(self.get('page_size=1000')['results']), 30)  # capped at 100, all 30 fit
        self.assertEqual(len(self.get('page_size=5')['results']), 5)
        self.assertEqual(self.get('page=99')['page'], 2)  # past the end: last page, not a 404
        self.assertEqual(self.get('page=abc')['page'], 1)

    def test_choices_lists_every_application_unpaginated(self):
        self.assertEqual(len(self.client.get('/api/applications/choices/').json()), 30)


@override_settings(TIME_ZONE='Asia/Jakarta')
class InterviewFilterTests(SignedInTestCase):
    def setUp(self):
        super().setUp()
        app = self.make_application()
        now = timezone.now()
        for days in [-40, -2, 3, 10, 70]:
            Interview.objects.create(application=app, scheduled_at=now + timedelta(days=days), interviewer=str(days))

    def interviewers(self, query):
        response = self.client.get(f'/api/interviews/?{query}')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        rows = body['results'] if isinstance(body, dict) else body
        return [row['interviewer'] for row in rows]

    def test_when_upcoming_and_past(self):
        self.assertEqual(self.interviewers('when=upcoming'), ['3', '10', '70'])
        self.assertEqual(self.interviewers('when=past'), ['-2', '-40'])  # newest first

    def test_date_range_is_inclusive_local_dates_and_unpaginated(self):
        today = timezone.localdate()
        start, end = today - timedelta(days=2), today + timedelta(days=10)
        response = self.client.get(f'/api/interviews/?from={start}&to={end}')
        self.assertIsInstance(response.json(), list)  # whole range, no pagination wrapper
        self.assertEqual([row['interviewer'] for row in response.json()], ['-2', '3', '10'])

    def test_bad_ranges_are_rejected(self):
        today = timezone.localdate()
        for query in ['from=2026-10-01', 'from=nope&to=2026-10-02', f'from={today}&to={today - timedelta(days=1)}',
                      f'from={today}&to={today + timedelta(days=63)}']:
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f'/api/interviews/?{query}').status_code, 400)


class AnalyticsTests(SignedInTestCase):
    """A small job search with hand-checked numbers (days are relative to today)."""

    def add(self, source, applied_days_ago, history, interviews=(), user=None):
        """history: [(status, days_ago), ...] oldest first; the last one is the current status."""
        app = self.make_application(
            user=user, source=source, status=history[-1][0],
            application_date=None if applied_days_ago is None else self.today - timedelta(days=applied_days_ago),
        )
        StatusChange.objects.filter(application=app).delete()  # replace the automatic entry
        previous = ''
        for status, days_ago in history:
            StatusChange.objects.create(
                application=app, from_status=previous, to_status=status,
                changed_at=timezone.now() - timedelta(days=days_ago),
            )
            previous = status
        for kind in interviews:
            Interview.objects.create(application=app, interview_type=kind, scheduled_at=timezone.now())
        return app

    def setUp(self):
        super().setUp()
        self.today = timezone.localdate()
        self.add('linkedin', 3, [('applied', 3)])                                                    # A: no answer yet
        self.add('linkedin', 10, [('applied', 10), ('screening', 6), ('rejected', 2)])               # B
        self.add('referral', 20, [('applied', 20), ('screening', 15), ('interview', 10)], ['skills_test'])  # C
        self.add('referral', 25, [('applied', 25), ('screening', 21), ('interview', 14), ('offer', 4)],
                 ['final_interview'])                                                                # D
        self.add('jobstreet', 8, [('applied', 8), ('rejected', 5)])                                  # E: CV rejected
        self.add('other', None, [('wishlist', 1)])                                                   # F: not applied
        self.add('other', 40, [('applied', 40)])                                                     # G: last period
        other = User.objects.create_user('other@example.com', 'a-strong-pass-123')
        self.add('linkedin', 2, [('applied', 2), ('offer', 1)], user=other)                          # not mine

    def get(self, period='30'):
        return self.client.get(f'/api/analytics/?period={period}').json()

    def test_kpis_compare_with_the_previous_period(self):
        kpis = self.get()['kpis']
        self.assertEqual(kpis['applications'], {'value': 5, 'previous': 1, 'rate': None, 'per_day': 0.2})
        self.assertEqual(kpis['interviews'], {'value': 2, 'previous': 0, 'rate': 40.0})
        self.assertEqual(kpis['offers'], {'value': 1, 'previous': 0, 'rate': 20.0})
        self.assertEqual(kpis['responses'], {'value': 4, 'previous': 0, 'rate': 80.0, 'avg_days': 4.0})

    def test_funnel_counts_stages_ever_reached(self):
        funnel = {row['stage']: row['count'] for row in self.get()['funnel']}
        # E was rejected straight from "applied", so it never passed the CV screening.
        self.assertEqual(funnel, {'submitted': 5, 'screening': 3, 'assessment': 2, 'final': 1, 'offer': 1})

    def test_channels_by_response_rate(self):
        channels = {row['source']: row for row in self.get()['channels']}
        self.assertEqual(list(channels), ['linkedin', 'referral', 'jobstreet'])
        self.assertEqual(
            {k: channels['referral'][k] for k in ['applications', 'interviews', 'offers', 'responses', 'response_rate']},
            {'applications': 2, 'interviews': 2, 'offers': 1, 'responses': 2, 'response_rate': 100.0},
        )
        self.assertEqual(channels['linkedin']['response_rate'], 50.0)

    def test_response_times_from_status_history(self):
        times = {row['stage']: row['avg_days'] for row in self.get()['response_times']}
        self.assertEqual(times, {'applied': 4.0, 'screening': 5.3, 'interview': 10.0, 'offer': 10.0})

    def test_weekly_answers_status_and_follow_ups(self):
        body = self.get()
        # This week (days 6..0): A sent; answers B screening (6), E rejected (5), D offer (4), B rejected (2).
        self.assertEqual(body['weekly'][-1], {'week_start': (self.today - timedelta(days=6)).isoformat(),
                                              'submitted': 1, 'responses': 4})
        self.assertEqual(body['status_counts']['wishlist'], 1)
        self.assertEqual(body['follow_up'], {'count': 1, 'after_days': 5})  # G: applied 40 days ago

    def test_all_time_has_no_previous_period(self):
        kpis = self.get('all')['kpis']
        self.assertEqual((kpis['applications']['value'], kpis['applications']['previous']), (6, None))
        self.assertEqual(self.get('nonsense')['period']['days'], 30)
