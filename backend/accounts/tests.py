from datetime import timedelta

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import User


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class AuthApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.user = User.objects.create_user('rafi@example.com', 'a-strong-pass-123', name='Rafi')

    def login(self, email='rafi@example.com', password='a-strong-pass-123'):
        return self.client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')

    def test_register_returns_a_working_token(self):
        response = self.client.post(
            '/api/auth/register/', {'email': 'New@Example.com', 'password': 'a-strong-pass-123', 'name': 'Budi'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['user']['email'], 'new@example.com')  # stored lowercase
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.json()['token']}")
        self.assertEqual(self.client.get('/api/auth/me/').json()['name'], 'Budi')

    def test_register_rejects_duplicates_and_weak_passwords(self):
        duplicate = self.client.post(
            '/api/auth/register/', {'email': 'RAFI@example.com', 'password': 'a-strong-pass-123'}, format='json'
        )
        self.assertIn('email', duplicate.json())
        for weak in ['short', '12345678901', 'password123']:
            with self.subTest(password=weak):
                response = self.client.post(
                    '/api/auth/register/', {'email': 'x@example.com', 'password': weak}, format='json'
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn('password', response.json())

    def test_login_is_case_insensitive_and_hides_which_part_was_wrong(self):
        self.assertEqual(self.login(email='RAFI@example.com').status_code, 200)
        wrong_password = self.login(password='nope').json()
        unknown_email = self.login(email='nobody@example.com').json()
        self.assertEqual(wrong_password, unknown_email)

    def test_logout_invalidates_the_token(self):
        token = self.login().json()['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, 204)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_expired_tokens_stop_working_and_login_issues_a_fresh_one(self):
        token = self.login().json()['token']
        Token.objects.filter(key=token).update(created=timezone.now() - timedelta(days=31))
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertNotEqual(self.login().json()['token'], token)

    def test_too_many_attempts_are_throttled(self):
        statuses = [self.login(password='nope').status_code for _ in range(11)]
        self.assertEqual(statuses[-1], 429)


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SettingsTests(APITestCase):
    def setUp(self):
        cache.clear()  # earlier tests' sign-in attempts would otherwise count against the throttle
        self.user = User.objects.create_user('rafi@example.com', 'a-strong-pass-123')
        self.client.force_authenticate(self.user)

    def patch(self, **fields):
        return self.client.patch('/api/auth/me/', fields, format='json')

    def test_update_preferences(self):
        response = self.patch(name='Rafi', weekly_goal=10, time_zone='Asia/Makassar', language='en', email='x@y.com')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(
            (self.user.name, self.user.weekly_goal, self.user.time_zone, self.user.language, self.user.email),
            ('Rafi', 10, 'Asia/Makassar', 'en', 'rafi@example.com'),  # email can't be changed here
        )

    def test_invalid_preferences_are_rejected(self):
        for fields in [{'time_zone': 'Mars/Olympus'}, {'weekly_goal': 0}, {'weekly_goal': 51}, {'language': 'fr'}]:
            with self.subTest(fields=fields):
                self.assertEqual(self.patch(**fields).status_code, 400)

    def test_register_keeps_the_language(self):
        self.client.force_authenticate(None)
        response = self.client.post(
            '/api/auth/register/', {'email': 'en@example.com', 'password': 'a-strong-pass-123', 'language': 'en'},
            format='json',
        )
        self.assertEqual(response.json()['user']['language'], 'en')


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'], TIME_ZONE='Asia/Jakarta')
class UserTimeZoneTests(APITestCase):
    def signed_in(self, email, time_zone):
        user = User.objects.create_user(email, 'a-strong-pass-123', time_zone=time_zone)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')
        return user

    def test_times_follow_each_users_time_zone_without_leaking(self):
        from applications.models import Application

        jayapura = self.signed_in('papua@example.com', 'Asia/Jayapura')
        app = Application.objects.create(user=jayapura, company_name='A', job_title='B')
        created = self.client.post(
            '/api/interviews/', {'application': app.id, 'scheduled_at': '2026-10-20T14:00'}, format='json'
        )
        self.assertEqual(created.json()['scheduled_at'], '2026-10-20T14:00:00+09:00')  # WIT

        jakarta = self.signed_in('jakarta@example.com', 'Asia/Jakarta')
        Application.objects.filter(pk=app.pk).update(user=jakarta)
        listed = self.client.get('/api/interviews/').json()['results']
        self.assertEqual(listed[0]['scheduled_at'], '2026-10-20T12:00:00+07:00')  # same moment, in WIB


@override_settings(
    PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'], FRONTEND_URL='https://app.example'
)
class PasswordResetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('rafi@example.com', 'old-pass-123456', name='Rafi')
        Token.objects.create(user=self.user)  # an existing sign-in somewhere

    def request_reset(self, email='rafi@example.com'):
        return self.client.post('/api/auth/password-reset/', {'email': email}, format='json')

    def link_params(self):
        from urllib.parse import parse_qs, urlsplit

        link = next(word for word in mail.outbox[-1].body.split() if word.startswith('https://app.example/'))
        query = parse_qs(urlsplit(link).query)
        return query['uid'][0], query['token'][0]

    def confirm(self, password='brand-new-pass-789', **overrides):
        uid, token = self.link_params()
        payload = {'uid': uid, 'token': token, 'password': password} | overrides
        return self.client.post('/api/auth/password-reset/confirm/', payload, format='json')

    def test_same_answer_for_known_and_unknown_emails(self):
        self.assertEqual(self.request_reset().status_code, 204)
        self.assertEqual(self.request_reset('nobody@example.com').status_code, 204)
        self.assertEqual(len(mail.outbox), 1)  # only the real account gets an email

    def test_email_is_in_the_accounts_language(self):
        self.request_reset()
        self.assertEqual(mail.outbox[0].subject, 'Atur ulang kata sandi ApplyTrack Anda')
        self.user.language = 'en'
        self.user.save()
        self.request_reset()
        self.assertEqual(mail.outbox[1].subject, 'Reset your ApplyTrack password')

    def test_reset_sets_the_password_signs_out_everywhere_and_the_link_works_once(self):
        self.request_reset()
        self.assertEqual(self.confirm().status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('brand-new-pass-789'))
        self.assertFalse(Token.objects.filter(user=self.user).exists())
        self.assertEqual(self.confirm(password='another-pass-456').status_code, 400)  # link used up

    def test_bad_links_and_weak_passwords_are_rejected(self):
        self.request_reset()
        self.assertIn('token', self.confirm(token='wrong').json())
        self.assertIn('token', self.confirm(uid='bm9wZQ').json())
        self.assertIn('password', self.confirm(password='123').json())

    def test_change_password_needs_the_current_one_and_keeps_this_device_signed_in(self):
        self.client.force_authenticate(self.user)
        wrong = self.client.post(
            '/api/auth/password-change/', {'current_password': 'nope', 'new_password': 'brand-new-pass-789'},
            format='json',
        )
        self.assertIn('current_password', wrong.json())
        right = self.client.post(
            '/api/auth/password-change/',
            {'current_password': 'old-pass-123456', 'new_password': 'brand-new-pass-789'}, format='json',
        )
        self.assertEqual(right.status_code, 200)
        self.assertEqual(list(Token.objects.filter(user=self.user).values_list('key', flat=True)), [right.json()['token']])
