import * as Sentry from '@sentry/browser';

if (window.env.SENTRY_ENABLED) {
	Sentry.init({ dsn: window.env.SENTRY_URL });
}