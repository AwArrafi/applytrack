from email.message import EmailMessage

from django.test import override_settings

from accounts.models import User

from .models import Application, ForwardedEmail
from .tests import JOBSTREET_APPLIED, SignedInTestCase

SECRET = 'test-inbound-secret'


def raw_email(body, *, subject='Lamaran terkirim', sender='Jobstreet <noreply@jobstreet.com>',
              message_id='<abc@jobstreet.com>', html=False):
    message = EmailMessage()
    message['From'], message['Subject'] = sender, subject
    if message_id:
        message['Message-ID'] = message_id
    if html:
        lines = ''.join(f'<tr><td>{line}</td></tr>' for line in body.splitlines() if line.strip())
        message.set_content(f'<html><head><style>p {{ color: red }}</style></head><body><table>{lines}</table></body></html>',
                            subtype='html')
    else:
        message.set_content(body)
    return message.as_bytes()


@override_settings(INBOUND_EMAIL_DOMAIN='inbound.example', INBOUND_EMAIL_SECRET=SECRET)
class InboundEmailTests(SignedInTestCase):
    def deliver(self, raw, to=None, secret=SECRET):
        return self.client.generic(
            'POST', '/api/inbound-email/', raw, content_type='message/rfc822',
            HTTP_AUTHORIZATION=f'Bearer {secret}', HTTP_X_ENVELOPE_TO=to or f'{self.user.inbound_token}@inbound.example',
        )

    def test_needs_the_secret(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.deliver(raw_email(JOBSTREET_APPLIED), secret='wrong').status_code, 403)
        with override_settings(INBOUND_EMAIL_SECRET=''):  # feature not configured: closed
            self.assertEqual(self.deliver(raw_email(JOBSTREET_APPLIED), secret='').status_code, 403)
        self.assertFalse(Application.objects.exists())

    def test_plain_text_email_creates_the_application(self):
        self.client.force_authenticate(None)  # the provider has no user session
        response = self.deliver(raw_email(JOBSTREET_APPLIED))
        self.assertEqual(response.json(), {'outcome': 'created'})
        app = Application.objects.get()
        self.assertEqual((app.user, app.job_title, app.company_name, app.source),
                         (self.user, 'Full Stack Web Developer', 'Jual Emas Indonesia', 'jobstreet'))
        record = ForwardedEmail.objects.get()
        self.assertEqual((record.outcome, record.application, record.subject), ('created', app, 'Lamaran terkirim'))

    def test_html_only_email_is_read_too(self):
        self.assertEqual(self.deliver(raw_email(JOBSTREET_APPLIED, html=True)).json(), {'outcome': 'created'})

    def test_the_same_email_twice_is_processed_once(self):
        self.deliver(raw_email(JOBSTREET_APPLIED))
        self.assertEqual(self.deliver(raw_email(JOBSTREET_APPLIED)).json(), {'outcome': 'duplicate'})
        no_id = raw_email(JOBSTREET_APPLIED, message_id=None)  # falls back to a hash of the email
        self.deliver(no_id)
        self.assertEqual(self.deliver(no_id).json(), {'outcome': 'duplicate'})
        self.assertEqual(Application.objects.count(), 1)

    def test_unknown_address_or_domain_is_accepted_and_dropped(self):
        for to in ['nobody123@inbound.example', f'{self.user.inbound_token}@elsewhere.example', '']:
            with self.subTest(to=to):
                self.assertEqual(self.deliver(raw_email(JOBSTREET_APPLIED), to=to or 'x').status_code, 202)
        self.assertFalse(ForwardedEmail.objects.exists())

    def test_unrecognised_email_is_logged_without_inventing_anything(self):
        response = self.deliver(raw_email('Lowongan baru minggu ini untuk Anda!', subject='Rekomendasi lowongan'))
        self.assertEqual(response.json(), {'outcome': 'unrecognized'})
        self.assertFalse(Application.objects.exists())

    def test_gmail_confirmation_code_is_shown_in_settings(self):
        confirmation = raw_email(
            'To allow forwarding, click the link or enter the code.',
            sender='Gmail Team <forwarding-noreply@google.com>',
            subject='(#123456789) Gmail Forwarding Confirmation - Receive Mail from budi@gmail.com',
            message_id='<gmail-confirm@google.com>',
        )
        self.assertEqual(self.deliver(confirmation).json(), {'outcome': 'gmail_confirmation'})
        self.deliver(raw_email(JOBSTREET_APPLIED))

        status = self.client.get('/api/email-forwarding/').json()
        self.assertEqual(status['address'], f'{self.user.inbound_token}@inbound.example')
        self.assertEqual(status['gmail_confirmation']['code'], '123456789')
        self.assertEqual([row['outcome'] for row in status['recent']], ['created'])  # confirmation not listed
        self.assertEqual(status['recent'][0]['application']['company_name'], 'Jual Emas Indonesia')

    def test_each_user_only_sees_their_own_forwarded_emails(self):
        self.deliver(raw_email(JOBSTREET_APPLIED))
        other = User.objects.create_user('other@example.com', 'a-strong-pass-123', email_verified=True)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/email-forwarding/').json()['recent'], [])
        self.assertNotEqual(other.inbound_token, self.user.inbound_token)

    def test_address_is_hidden_until_a_domain_is_set(self):
        with override_settings(INBOUND_EMAIL_DOMAIN=''):
            self.assertIsNone(self.client.get('/api/email-forwarding/').json()['address'])
