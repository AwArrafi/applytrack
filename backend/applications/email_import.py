"""Reads job portal emails (application sent, rejected, ...) and applies them to a user's
applications. Today the text is pasted on the Applications page; once the app has a domain,
forwarded emails will come in through the same import_email().

Each portal gets its own pattern, written from real emails. A text no pattern recognises is
reported as such, never guessed.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime, time

from django.db import transaction
from django.utils import timezone

from .models import Application

Status = Application.Status

# JobStreet writes months in English even in Indonesian emails; Indonesian names are accepted too.
MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'mei': 5, 'jun': 6, 'jul': 7,
    'aug': 8, 'agu': 8, 'agt': 8, 'sep': 9, 'oct': 10, 'okt': 10, 'nov': 11, 'dec': 12, 'des': 12,
}


@dataclass
class ParsedEmail:
    source: str  # an Application.Source value
    company_name: str
    job_title: str
    status: str  # what the email says the application's status is now
    applied_on: date | None = None


def parse_date(day, month, today):
    """'13', 'Oct' -> the most recent 13 October not after today (emails don't show the year)."""
    month_number = MONTHS.get(month[:3].lower())
    if month_number is None:
        return None
    try:
        parsed = date(today.year, month_number, int(day))
    except ValueError:
        return None
    return parsed if parsed <= today else parsed.replace(year=today.year - 1)


# --- JobStreet (Indonesian emails) ---------------------------------------------------------
# Every JobStreet email ends with the same job card:
#
#     Full Stack Web Developer        <- role
#     Jual Emas Indonesia             <- company
#
#     Dilamar pada 14 Oct
#
# The card gives the names (company names may contain dots, which break sentence parsing);
# the opening sentence says what happened.

JOBSTREET_CARD = re.compile(
    r'^[ \t]*(?P<title>\S[^\n]*?)[ \t]*\n'  # role line
    r'[ \t]*(?P<company>\S[^\n]*?)[ \t]*\n'  # company line
    r'\s*Dilamar pada\s+(?P<day>\d{1,2})\s+(?P<month>[A-Za-z]+)',
    re.IGNORECASE | re.MULTILINE,
)
JOBSTREET_EVENTS = [
    (re.compile(r'berhasil dikirim ke', re.IGNORECASE), Status.APPLIED),
    (re.compile(r'belum dapat dilanjutkan', re.IGNORECASE), Status.REJECTED),
]


def parse_jobstreet(text, today):
    card = JOBSTREET_CARD.search(text)
    status = next((status for pattern, status in JOBSTREET_EVENTS if pattern.search(text)), None)
    if not card or status is None:
        return None
    return ParsedEmail(
        source=Application.Source.JOBSTREET,
        company_name=' '.join(card['company'].split()),
        job_title=' '.join(card['title'].split()),
        status=status,
        applied_on=parse_date(card['day'], card['month'], today),
    )


PARSERS = [parse_jobstreet]


INVISIBLE = re.compile('[​-‏⁠﻿­͏]')  # zero-width and soft-hyphen characters
SPACES = re.compile(r'[^\S\n]')  # any whitespace but a line break: NBSP, tabs, \r, ...


def normalise(text):
    """Text copied out of an email client is full of look-alike spaces and invisible characters
    (marketing emails pad with them); make it plain so the patterns' literal spaces match."""
    return SPACES.sub(' ', INVISIBLE.sub('', text))


def parse_email(text, today=None):
    today = today or timezone.localdate()
    text = normalise(text)
    for parser in PARSERS:
        parsed = parser(text, today)
        if parsed:
            return parsed
    return None


# --- Applying it ---------------------------------------------------------------------------

@transaction.atomic
def import_email(user, text):
    """Returns ('created' | 'updated' | 'unchanged', application), or (None, None) when the
    email isn't one we recognise."""
    parsed = parse_email(text)
    if parsed is None:
        return None, None

    existing = (
        Application.objects.owned_by(user)
        .filter(company_name__iexact=parsed.company_name, job_title__iexact=parsed.job_title)
        .order_by('-updated_at')
        .first()
    )
    if existing:
        if existing.status == parsed.status:
            return 'unchanged', existing
        existing.status = parsed.status
        if existing.application_date is None and parsed.applied_on:
            existing.application_date = parsed.applied_on
        existing.save()  # records the status change for Analytics
        return 'updated', existing

    # Not tracked yet: add it as applied on the email's date, then move it to the new status, so
    # the history (and Analytics' reply times) reflects both steps.
    application = Application.objects.create(
        user=user,
        company_name=parsed.company_name,
        job_title=parsed.job_title,
        source=parsed.source,
        status=Status.APPLIED,
        application_date=parsed.applied_on or timezone.localdate(),
    )
    if parsed.applied_on:
        applied_at = timezone.make_aware(datetime.combine(parsed.applied_on, time(9)))
        application.status_changes.update(changed_at=applied_at)
    if parsed.status != Status.APPLIED:
        application.status = parsed.status
        application.save()
    return 'created', application
