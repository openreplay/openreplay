const jwt = require('jsonwebtoken');
const uaParser = require('ua-parser-js');
const {geoip} = require('./geoIP');
const {extractPeerId} = require('./helper');

let debug = process.env.debug === "1";

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
                let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
                ip = ip.split(",")[0];
                let country = geoip().country(ip);
                socket.handshake.query.sessionInfo.userCountry = country.country.isoCode;
            } catch (e) {
                debug && console.log("geoip-country failed");
                debug && console.log(e);
            }
        }
    }
}

function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.ASSIST_JWT_SECRET, {expiresIn: process.env.ASSIST_JWT_EXPIRATION || '30m'});
}

const JWT_TOKEN_PREFIX = "Bearer ";

function check(socket, next) {
    if (socket.handshake.query.identity === 'session') {
        return next();
    }
    if (socket.handshake.query.peerId && socket.handshake.auth && socket.handshake.auth.token) {
        let token = socket.handshake.auth.token;
        if (token.startsWith(JWT_TOKEN_PREFIX)) {
            token = token.substring(JWT_TOKEN_PREFIX.length);
        }
        jwt.verify(token, process.env.ASSIST_JWT_SECRET, (err, decoded) => {
            debug && console.log("JWT payload:");
            debug && console.log(decoded);
            if (err) {
                debug && console.error(err);
                return next(new Error('Authentication error'));
            }
            const {projectKey, sessionId} = extractPeerId(socket.handshake.query.peerId);
            if (!projectKey || !sessionId) {
                debug && console.error("Missing attribute:");
                debug && console.error(`projectKey:${projectKey}, sessionId:${sessionId}`);
                return next(new Error('Authentication error'));
            }
            if (String(projectKey) !== String(decoded.projectKey) || String(sessionId) !== String(decoded.sessionId)) {
                debug && console.error(`Trying to access projectKey:${projectKey} instead of ${decoded.projectKey}\nor`);
                debug && console.error(`Trying to access sessionId:${sessionId} instead of ${decoded.sessionId}`);
                return next(new Error('Authorization error'));
            }
            socket.decoded = decoded;
            return next();
        });
    } else {
        debug && console.error("something missing in:");
        debug && console.error(socket.handshake);
        return next(new Error('Authentication error'));
    }
}

module.exports = {
    extractSessionInfo,
    authorizer: {generateAccessToken, check}
};