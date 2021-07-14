require('dotenv').config()

// TODO: derive version from the tracker package on build
//const trackerInfo = require('../tracker/tracker/package.json');

const oss = {
	name: 'oss',
	PRODUCTION: true,
	SENTRY_ENABLED: false,
	SENTRY_URL: "",
	CAPTCHA_ENABLED: process.env.CAPTCHA_ENABLED === 'true',
	CAPTCHA_SITE_KEY: process.env.CAPTCHA_SITE_KEY,
	ORIGIN: () => 'window.location.origin',
	API_EDP: () => 'window.location.origin + "/api"',
	ASSETS_HOST: () => 'window.location.origin + "/assets"',
	VERSION: '1.2.0',
	SOURCEMAP: true,
	MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
	MINIO_PORT: process.env.MINIO_PORT,
	MINIO_USE_SSL: process.env.MINIO_USE_SSL,
	MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
	TRACKER_VERSION: '3.0.5', // trackerInfo.version,
}

const local = {
	...oss,
	API_EDP: 'https://sacha.openreplay.com/api',//'https://do.openreplay.com/api',
	ASSETS_HOST: 'https://sacha.openreplay.com/assets',//'https://do.openreplay.com/assets',
	SOURCEMAP: false,
	PRODUCTION: false,
}

module.exports = {
    oss,
    local,
};