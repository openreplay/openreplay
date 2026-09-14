import ENV from '../../env';

// @sentry/browser pulls ~336KB of source onto the critical path, and most
// deployments run with SENTRY_ENABLED unset. Load it only when it will be used;
// the import resolves after first paint, which is fine for error reporting.
if (ENV.SENTRY_ENABLED === 'true') {
  void import('@sentry/browser').then((Sentry) => {
    Sentry.init({ dsn: ENV.SENTRY_URL });
  });
}
