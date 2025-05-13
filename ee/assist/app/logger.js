const winston = require('winston');

const isDebugMode = process.env.debug === "1";
const logLevel = isDebugMode ? 'debug' : 'info';

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS' // The same format as in backend services
        }),
        winston.format.errors({stack: true}),
        winston.format.json()
    ),
    defaultMeta: {service: process.env.SERVICE_NAME || 'assist'},
    transports: [
        new winston.transports.Console(),
    ],
});

module.exports = {
    logger,
}
