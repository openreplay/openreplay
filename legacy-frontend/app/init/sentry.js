import * as Sentry from '@sentry/browser';

if (window.env && window.env.SENTRY_ENABLED === 'true') {
	Sentry.init({ dsn: window.env.SENTRY_URL });
}
