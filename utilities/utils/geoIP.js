const geoip2Reader = require('@maxmind/geoip2-node').Reader;
let geoip = null;
if (process.env.MAXMINDDB_FILE !== undefined) {
    geoip2Reader.open(process.env.MAXMINDDB_FILE, {})
        .then(reader => {
            geoip = reader;
        })
        .catch(error => {
            console.log("Error while opening the MAXMINDDB_FILE.")
            console.error(error);
        });
} else {
    console.error("!!! please provide a valid value for MAXMINDDB_FILE env var.");
}

module.exports = {
    geoip: () => {
        return geoip;
    }
}