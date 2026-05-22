const isDevelopment = process.env.NODE_ENV === 'development';

const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PRODUCTION: process.env.PRODUCTION ?? !isDevelopment,
  SOURCEMAP: process.env.SOURCEMAP,
  ORIGIN: process.env.ORIGIN,
  ASSETS_HOST: process.env.ASSETS_HOST,
  API_EDP: process.env.API_EDP,
  SENTRY_ENABLED: process.env.SENTRY_ENABLED,
  SENTRY_URL: process.env.SENTRY_URL,
  CAPTCHA_ENABLED: process.env.CAPTCHA_ENABLED,
  CAPTCHA_SITE_KEY: process.env.CAPTCHA_SITE_KEY,
  VERSION: process.env.VERSION,
  TRACKER_ENABLED: process.env.TRACKER_ENABLED,
  TRACKER_VERSION: process.env.TRACKER_VERSION,
  TRACKER_MAJOR_VERSION: process.env.TRACKER_MAJOR_VERSION,
  TRACKER_PROJECT_KEY: process.env.TRACKER_PROJECT_KEY,
  COMMIT_HASH: process.env.COMMIT_HASH,
  TRACKER_HOST: process.env.TRACKER_HOST,
  TEST_FOSS_LOGIN: !isDevelopment ? undefined : process.env.TEST_FOSS_LOGIN,
  TEST_FOSS_PASSWORD: !isDevelopment
    ? undefined
    : process.env.TEST_FOSS_PASSWORD,
  STRIPE_KEY: process.env.STRIPE_KEY,
  CRISP_KEY: process.env.CRISP_KEY,
};

export default ENV;
