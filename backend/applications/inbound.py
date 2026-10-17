"""Job portal emails forwarded to a user's ApplyTrack address.

The user's mail filter forwards portal emails to <inbound_token>@INBOUND_EMAIL_DOMAIN. The mail
provider (a Cloudflare Email Worker, see infra/cloudflare-email-worker.js) posts each raw email
to InboundEmailView, which hands its text to the same importer as the paste dialog.
"""

import hashlib
import hmac
import re
from email import message_from_bytes, policy
from html.parser import HTMLParser

from django.conf import settings
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .email_import import import_email
from .models import ForwardedEmail

MAX_EMAIL_BYTES = 5 * 1024 * 1024  # portal emails are a few hundred KB at most
# Gmail asks the new forwarding address to confirm: "(#123456789) Gmail Forwarding Confirmation".
GMAIL_CONFIRMATION_SENDER = 'forwarding-noreply@google.com'
GMAIL_CODE = re.compile(r'\(#(\d+)\)')


class _TextFromHtml(HTMLParser):
    """HTML email -> one line per block, so a portal's "role / company / applied on" card stays
    on separate lines the way the importer's patterns expect."""

    BLOCKS = {'p', 'div', 'br', 'tr', 'td', 'th', 'li', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}

    def __init__(self):
        super().__init__()
        self.parts, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head'):
            self.skip += 1
        elif tag in self.BLOCKS:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'head'):
            self.skip = max(0, self.skip - 1)
        elif tag in self.BLOCKS:
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def email_text(message):
    """The readable text of an email: its plain-text part, or its HTML part as text."""
    body = message.get_body(preferencelist=('plain', 'html'))
    if body is None:
        return ''
    content = body.get_content()
    if body.get_content_type() == 'text/html':
        parser = _TextFromHtml()
        parser.feed(content)
        content = ''.join(parser.parts)
    # Drop the empty lines block markup leaves behind (the importer also normalises spaces).
    return '\n'.join(line.strip() for line in content.splitlines() if line.strip())


def recipient_user(address):
    local, _, domain = (address or '').strip().lower().rpartition('@')
    if not local or domain != settings.INBOUND_EMAIL_DOMAIN.lower():
        return None
    return User.objects.filter(inbound_token=local, is_active=True).first()


class InboundEmailView(APIView):
    """Called by the mail provider, not by people: authenticated with INBOUND_EMAIL_SECRET.

    Body: the raw email (MIME). Header X-Envelope-To: the address it was sent to.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    # All mail arrives from the provider's few IPs; an IP limit would drop real emails.
    throttle_classes = []

    def post(self, request):
        secret = settings.INBOUND_EMAIL_SECRET
        given = request.headers.get('Authorization', '').removeprefix('Bearer ')
        if not secret or not hmac.compare_digest(given.encode(), secret.encode()):
            return Response(status=status.HTTP_403_FORBIDDEN)
        raw = request.body
        if len(raw) > MAX_EMAIL_BYTES:
            return Response(status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        user = recipient_user(request.headers.get('X-Envelope-To'))
        if user is None:
            # Accepted and dropped: an unknown address isn't the sender's business, and a retry won't help.
            return Response(status=status.HTTP_202_ACCEPTED)

        message = message_from_bytes(raw, policy=policy.default)
        message_id = (message.get('Message-ID') or '').strip()[:255] or hashlib.sha256(raw).hexdigest()
        if ForwardedEmail.objects.filter(user=user, message_id=message_id).exists():
            return Response({'outcome': 'duplicate'}, status=status.HTTP_200_OK)

        sender = str(message.get('From', ''))[:254]
        subject = str(message.get('Subject', ''))[:255]
        record = ForwardedEmail(user=user, message_id=message_id, sender=sender, subject=subject)

        code = GMAIL_CODE.search(subject)
        if GMAIL_CONFIRMATION_SENDER in sender.lower() and code:
            record.outcome = ForwardedEmail.Outcome.GMAIL_CONFIRMATION
            record.confirmation_code = code.group(1)
        else:
            result, application = import_email(user, email_text(message))
            record.outcome = result or ForwardedEmail.Outcome.UNRECOGNIZED
            record.application = application

        try:
            with transaction.atomic():
                record.save()
        except IntegrityError:  # the same email arriving twice at once
            return Response({'outcome': 'duplicate'}, status=status.HTTP_200_OK)
        return Response({'outcome': record.outcome}, status=status.HTTP_200_OK)


class ForwardedEmailSerializer(serializers.ModelSerializer):
    application = serializers.SerializerMethodField()

    class Meta:
        model = ForwardedEmail
        fields = ['id', 'sender', 'subject', 'received_at', 'outcome', 'application']

    def get_application(self, record):
        app = record.application
        return app and {'id': app.id, 'company_name': app.company_name, 'job_title': app.job_title}


class EmailForwardingView(APIView):
    """For the Settings page: the user's forwarding address, Gmail's latest confirmation code,
    and the emails that arrived recently."""

    def get(self, request):
        emails = ForwardedEmail.objects.filter(user=request.user).select_related('application')
        confirmation = emails.filter(outcome=ForwardedEmail.Outcome.GMAIL_CONFIRMATION).first()
        domain = settings.INBOUND_EMAIL_DOMAIN
        return Response({
            # None until the server has a domain for incoming mail.
            'address': f'{request.user.inbound_token}@{domain}' if domain else None,
            'gmail_confirmation': confirmation and {
                'code': confirmation.confirmation_code, 'received_at': confirmation.received_at,
            },
            'recent': ForwardedEmailSerializer(emails.exclude(outcome=ForwardedEmail.Outcome.GMAIL_CONFIRMATION)[:10],
                                               many=True).data,
        })
