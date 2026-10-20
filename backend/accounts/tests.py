import base64
import io
import json
import urllib.error
import urllib.parse
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .google import TOKEN_URL
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


class DeleteAccountTests(APITestCase):
    def setUp(self):
        from applications.models import Application, ForwardedEmail, Interview, StatusChange
        self.models = [Application, Interview, StatusChange, ForwardedEmail]
        self.user = User.objects.create_user('leaving@example.com', 'a-strong-pass-123')
        self.other = User.objects.create_user('staying@example.com', 'a-strong-pass-123')
        for owner in (self.user, self.other):
            app = Application.objects.create(user=owner, company_name='Acme', job_title='Dev')
            Interview.objects.create(application=app, scheduled_at=timezone.now())
            ForwardedEmail.objects.create(user=owner, message_id='<m@x>', outcome='created', application=app)
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def delete(self, password):
        return self.client.post('/api/auth/delete-account/', {'password': password}, format='json')

    def test_wrong_password_keeps_everything(self):
        response = self.delete('not-my-password')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json())
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_deletes_the_user_and_all_their_data_but_nobody_elses(self):
        self.assertEqual(self.delete('a-strong-pass-123').status_code, 204)
        self.assertFalse(User.objects.filter(email='leaving@example.com').exists())
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())
        for model in self.models:  # one row of each left: the other user's
            self.assertEqual(model.objects.count(), 1, model.__name__)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)  # the session is gone too

    def test_needs_a_session(self):
        self.client.credentials()
        self.assertEqual(self.delete('a-strong-pass-123').status_code, 401)


class FailedLoginLimitTests(APITestCase):
    """5 wrong passwords lock that account's sign-in for 15 minutes, whatever IP they come from."""

    def setUp(self):
        cache.clear()
        User.objects.create_user('target@example.com', 'the-right-pass-123')

    def login(self, password, email='target@example.com', ip='1.1.1.1'):
        return self.client.post('/api/auth/login/', {'email': email, 'password': password}, format='json', REMOTE_ADDR=ip)

    def test_locks_after_five_failures_even_with_the_right_password_from_another_ip(self):
        for n in range(5):
            self.assertEqual(self.login('wrong', ip=f'10.0.0.{n}').status_code, 400)
        self.assertEqual(self.login('the-right-pass-123', ip='10.9.9.9').status_code, 429)
        self.assertEqual(self.login('the-right-pass-123', email='TARGET@example.com ').status_code, 429)  # same account

    def test_lock_ends_after_the_window(self):
        for _ in range(5):
            self.login('wrong')
        cache.clear()  # what 15 minutes later looks like: the counter has expired
        self.assertEqual(self.login('the-right-pass-123').status_code, 200)

    def test_a_successful_sign_in_resets_the_count_and_other_accounts_are_unaffected(self):
        # Each from its own IP, so only the per-account limit is in play.
        for n in range(4):
            self.login('wrong', ip=f'10.0.1.{n}')
        self.assertEqual(self.login('the-right-pass-123', ip='10.0.2.1').status_code, 200)
        for n in range(4):
            self.assertEqual(self.login('wrong', ip=f'10.0.3.{n}').status_code, 400)  # counting from zero again
        self.assertEqual(self.login('wrong', email='someone-else@example.com', ip='10.0.4.1').status_code, 400)

    def test_odd_input_is_not_counted_or_crashing(self):
        self.assertEqual(self.login('x', email='a' * 5000).status_code, 400)
        for _ in range(6):
            self.client.post('/api/auth/login/', {'email': 'target@example.com'}, format='json')  # no password
        self.assertEqual(self.login('the-right-pass-123').status_code, 200)


def google_token_response(**claims):
    """What Google's token endpoint answers: an ID token whose middle part holds the claims."""
    claims = {'iss': 'https://accounts.google.com', 'aud': 'test-client', 'email_verified': True, **claims}
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    return io.BytesIO(json.dumps({'id_token': f'header.{payload}.signature'}).encode())


@override_settings(GOOGLE_CLIENT_ID='test-client', GOOGLE_CLIENT_SECRET='test-secret')
class GoogleLoginTests(APITestCase):
    def setUp(self):
        cache.clear()

    def sign_in(self, language='en', **claims):
        with mock.patch('urllib.request.urlopen', return_value=google_token_response(**claims)) as urlopen:
            response = self.client.post(
                '/api/auth/google/',
                {'code': 'one-time-code', 'redirect_uri': 'https://app.example/auth/google/callback', 'language': language},
                format='json',
            )
        self.sent = urllib.parse.parse_qs(urlopen.call_args.kwargs['data'].decode()) if urlopen.called else None
        return response

    def test_first_sign_in_creates_an_account_without_a_password(self):
        response = self.sign_in(email='New@Gmail.com', name='Budi')
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='new@gmail.com')
        self.assertEqual((user.name, user.language), ('Budi', 'en'))
        self.assertFalse(response.json()['user']['has_password'])
        self.assertEqual(self.sent['client_secret'], ['test-secret'])
        self.assertEqual(self.sent['redirect_uri'], ['https://app.example/auth/google/callback'])

    def test_signs_in_an_existing_account_with_that_email(self):
        user = User.objects.create_user('rafi@gmail.com', 'a-strong-pass-123')
        response = self.sign_in(email='rafi@gmail.com')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Token.objects.get(key=response.json()['token']).user, user)
        self.assertTrue(response.json()['user']['has_password'])  # the password still works too

    def test_rejects_unverified_emails_other_clients_and_inactive_accounts(self):
        User.objects.create_user('gone@gmail.com', is_active=False)
        for claims in [
            {'email': 'x@gmail.com', 'email_verified': False},
            {'email': 'x@gmail.com', 'aud': 'someone-elses-client'},
            {'email': 'x@gmail.com', 'iss': 'https://evil.example'},
            {'email': 'gone@gmail.com'},
        ]:
            with self.subTest(claims=claims):
                response = self.sign_in(**claims)
                self.assertEqual(response.status_code, 400)
                self.assertIn('non_field_errors', response.json())
        self.assertFalse(User.objects.filter(email='x@gmail.com').exists())

    def test_a_code_google_refuses_is_a_normal_error(self):
        error = urllib.error.HTTPError(TOKEN_URL, 400, 'invalid_grant', {}, io.BytesIO(b'{}'))
        with mock.patch('urllib.request.urlopen', side_effect=error), self.assertLogs('accounts.google', 'WARNING'):
            response = self.client.post(
                '/api/auth/google/', {'code': 'used', 'redirect_uri': 'https://app.example/cb'}, format='json'
            )
        self.assertEqual(response.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID='')
    def test_off_without_a_client_id(self):
        self.assertEqual(self.sign_in(email='x@gmail.com').status_code, 400)
        self.assertIsNone(self.sent)  # Google wasn't even asked


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class AccountWithoutPasswordTests(APITestCase):
    """Accounts made with Google: Settings confirms with the email, and can set a first password."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('google@gmail.com')
        self.client.force_authenticate(self.user)

    def test_sets_a_first_password_without_a_current_one(self):
        response = self.client.post('/api/auth/password-change/', {'new_password': 'brand-new-pass-789'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('brand-new-pass-789'))

    def test_delete_account_asks_for_the_email(self):
        wrong = self.client.post('/api/auth/delete-account/', {'email': 'someone@gmail.com'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        self.assertIn('email', wrong.json())
        right = self.client.post('/api/auth/delete-account/', {'email': ' Google@Gmail.com '}, format='json')
        self.assertEqual(right.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_a_password_account_still_needs_its_current_password(self):
        user = User.objects.create_user('pw@example.com', 'a-strong-pass-123')
        self.client.force_authenticate(user)
        response = self.client.post('/api/auth/password-change/', {'new_password': 'brand-new-pass-789'}, format='json')
        self.assertIn('current_password', response.json())
        response = self.client.post('/api/auth/delete-account/', {'email': 'pw@example.com'}, format='json')
        self.assertIn('password', response.json())
