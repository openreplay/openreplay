require('dotenv').config()

// TODO: (the problem is during the build time the frontend is isolated, as far as I remember)
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
	VERSION: '1.5.2',
	SOURCEMAP: true,
	MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
	MINIO_PORT: process.env.MINIO_PORT,
	MINIO_USE_SSL: process.env.MINIO_USE_SSL,
	MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
	ICE_SERVERS: process.env.ICE_SERVERS,
	TRACKER_VERSION: '3.5.2' // trackerInfo.version,
}

module.exports = {
    oss,    
};
