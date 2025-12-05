import * as Sentry from '@sentry/browser';
import ENV from '../../env';

if (ENV.SENTRY_ENABLED === 'true') {
  Sentry.init({ dsn: ENV.SENTRY_URL });
}
