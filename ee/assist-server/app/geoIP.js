const geoip2Reader = require('@maxmind/geoip2-node').Reader;
const {logger} = require('./logger');

let geoip = null;
if (process.env.MAXMINDDB_FILE !== undefined) {
    geoip2Reader.open(process.env.MAXMINDDB_FILE, {})
        .then(reader => {
            geoip = reader;
        })
        .catch(error => {
            logger.error(`Error while opening the MAXMINDDB_FILE, err: ${error}`);
        });
} else {
    logger.error("!!! please provide a valid value for MAXMINDDB_FILE env var.");
}

module.exports = {
    geoip: () => {
        return geoip;
    }
}