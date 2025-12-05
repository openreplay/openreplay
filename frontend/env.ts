const isDevelopment = process.env.NODE_ENV === 'development';

const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PRODUCTION: process.env.PRODUCTION ?? !isDevelopment,
  SOURCEMAP: process.env.SOURCEMAP,
  KAI_TESTING: process.env.KAI_TESTING,
  ORIGIN: process.env.ORIGIN,
  ASSETS_HOST: process.env.ASSETS_HOST,
  API_EDP: process.env.API_EDP,
  SENTRY_ENABLED: process.env.SENTRY_ENABLED,
  SENTRY_URL: process.env.SENTRY_URL,
  CAPTCHA_ENABLED: process.env.CAPTCHA_ENABLED,
  CAPTCHA_SITE_KEY: process.env.CAPTCHA_SITE_KEY,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_POST: process.env.MINIO_PORT,
  MINIO_USE_SSL: process.env.MINIO_USE_SSL,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  VERSION: process.env.VERSION,
  TRACKER_ENABLED: process.env.TRACKER_ENABLED,
  TRACKER_VERSION: process.env.TRACKER_VERSION,
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
