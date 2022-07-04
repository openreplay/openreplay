const uaParser = require('ua-parser-js');
const {geoip} = require('./geoIP');

let debug = process.env.debug === "1" || false;

const BASE_sessionInfo = {
    "pageTitle": "Page",
    "active": true,
    "live": true,
    "sessionID": "0",
    "metadata": {},
    "userID": "",
    "userUUID": "",
    "projectKey": "",
    "revID": "",
    "timestamp": 0,
    "trackerVersion": "",
    "isSnippet": true,
    "userOs": "",
    "userBrowser": "",
    "userBrowserVersion": "",
    "userDevice": "",
    "userDeviceType": "",
    "userCountry": "",
    "projectId": 0
};


const extractSessionInfo = function (socket) {
    if (socket.handshake.query.sessionInfo !== undefined) {
        debug && console.log("received headers");
        debug && console.log(socket.handshake.headers);
        socket.handshake.query.sessionInfo = JSON.parse(socket.handshake.query.sessionInfo);
        socket.handshake.query.sessionInfo = {...BASE_sessionInfo, ...socket.handshake.query.sessionInfo};

        let ua = uaParser(socket.handshake.headers['user-agent']);
        socket.handshake.query.sessionInfo.userOs = ua.os.name || null;
        socket.handshake.query.sessionInfo.userBrowser = ua.browser.name || null;
        socket.handshake.query.sessionInfo.userBrowserVersion = ua.browser.version || null;
        socket.handshake.query.sessionInfo.userDevice = ua.device.model || null;
        socket.handshake.query.sessionInfo.userDeviceType = ua.device.type || 'desktop';
        socket.handshake.query.sessionInfo.userCountry = null;
        if (geoip() !== null) {
            debug && console.log(`looking for location of ${socket.handshake.headers['x-forwarded-for'] || socket.handshake.address}`);
            try {
                let country = geoip().country(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address);
                socket.handshake.query.sessionInfo.userCountry = country.country.isoCode;
            } catch (e) {
                debug && console.log("geoip-country failed");
                debug && console.log(e);
            }
        }
    }
}


module.exports = {
    extractSessionInfo
};