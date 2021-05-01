import * as Sentry from '@sentry/browser';

if (window.ENV.SENTRY_ENABLED) {
	Sentry.init({ dsn: window.ENV.SENTRY_URL });
}