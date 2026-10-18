from pathlib import Path
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.db import OperationalError
from django.test import SimpleTestCase, TestCase

from .database import database_from_url


class DatabaseUrlTests(SimpleTestCase):
    def test_empty_means_local_sqlite(self):
        self.assertEqual(database_from_url('', Path('db.sqlite3'))['ENGINE'], 'django.db.backends.sqlite3')

    def test_postgres_url_with_escaped_password_and_options(self):
        db = database_from_url('postgres://app:p%40ss%2Fword@db.example.com:6543/applytrack?sslmode=require', Path())
        self.assertEqual(
            {key: db[key] for key in ['ENGINE', 'NAME', 'USER', 'PASSWORD', 'HOST', 'PORT', 'OPTIONS']},
            {
                'ENGINE': 'django.db.backends.postgresql', 'NAME': 'applytrack', 'USER': 'app',
                'PASSWORD': 'p@ss/word', 'HOST': 'db.example.com', 'PORT': '6543', 'OPTIONS': {'sslmode': 'require'},
            },
        )

    def test_other_databases_are_refused(self):
        with self.assertRaises(ImproperlyConfigured):
            database_from_url('mysql://u:p@host/db', Path())


class HealthTests(TestCase):
    def test_health_needs_no_sign_in(self):
        response = self.client.get('/api/health/')
        self.assertEqual((response.status_code, response.json()), (200, {'status': 'ok'}))

    def test_database_is_only_checked_when_asked(self):
        with self.assertNumQueries(0), patch('config.views.connection.ensure_connection') as ensure:
            self.client.get('/api/health/')
        ensure.assert_not_called()
        with patch('config.views.connection.ensure_connection', side_effect=OperationalError('down')):
            with self.assertRaises(OperationalError):  # the test client re-raises; in production: a 500
                self.client.get('/api/health/?db=1')
