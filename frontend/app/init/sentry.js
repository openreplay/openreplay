import ENV from '../../env';

// ~336KB on the critical path for something most deployments leave disabled.
// Resolving after first paint is fine for error reporting.
if (ENV.SENTRY_ENABLED === 'true') {
  void import('@sentry/browser').then((Sentry) => {
    Sentry.init({ dsn: ENV.SENTRY_URL });
  });
}
