const jwt = require('jsonwebtoken');
const uaParser = require('ua-parser-js');
const {geoip} = require('./geoIP');
const {extractPeerId} = require('./helper');
const {logger} = require('./logger');

const IDENTITIES = {agent: 'agent', session: 'session'};
const EVENTS_DEFINITION = {
    listen: {
        UPDATE_EVENT: "UPDATE_SESSION", // tab become active/inactive, page title change, changed session object (rare case), call start/end
        CONNECT_ERROR: "connect_error",
        CONNECT_FAILED: "connect_failed",
        ERROR: "error"
    },
    //The following list of events will be only emitted by the server
    server: {
        UPDATE_SESSION: "SERVER_UPDATE_SESSION"
    }
};
EVENTS_DEFINITION.emit = {
    NEW_AGENT: "NEW_AGENT",
    NO_AGENTS: "NO_AGENT",
    AGENT_DISCONNECT: "AGENT_DISCONNECTED",
    AGENTS_CONNECTED: "AGENTS_CONNECTED",
    NO_SESSIONS: "SESSION_DISCONNECTED",
    SESSION_ALREADY_CONNECTED: "SESSION_ALREADY_CONNECTED",
    SESSION_RECONNECTED: "SESSION_RECONNECTED",
    UPDATE_EVENT: EVENTS_DEFINITION.listen.UPDATE_EVENT
};

const BASE_sessionInfo = {
    "pageTitle": "Page",
    "active": false,
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
    "userState": "",
    "userCity": "",
    "projectId": 0
};

/**
 * extracts and populate socket with information
 * @Param {socket} used socket
 * */
const extractSessionInfo = function (socket) {
    if (socket.handshake.query.sessionInfo !== undefined) {
        logger.debug(`received headers: ${socket.handshake.headers}`);

        socket.handshake.query.sessionInfo = JSON.parse(socket.handshake.query.sessionInfo);
        socket.handshake.query.sessionInfo = {...BASE_sessionInfo, ...socket.handshake.query.sessionInfo};

        let ua = uaParser(socket.handshake.headers['user-agent']);
        socket.handshake.query.sessionInfo.userOs = ua.os.name || null;
        socket.handshake.query.sessionInfo.userBrowser = ua.browser.name || null;
        socket.handshake.query.sessionInfo.userBrowserVersion = ua.browser.version || null;
        socket.handshake.query.sessionInfo.userDevice = ua.device.model || null;
        socket.handshake.query.sessionInfo.userDeviceType = ua.device.type || 'desktop';
        socket.handshake.query.sessionInfo.userCountry = null;
        socket.handshake.query.sessionInfo.userState = null;
        socket.handshake.query.sessionInfo.userCity = null;
        if (geoip() !== null) {
            logger.debug(`looking for location of ${socket.handshake.headers['x-forwarded-for'] || socket.handshake.address}`);
            try {
                let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
                ip = ip.split(",")[0];
                let info = geoip().city(ip);
                socket.handshake.query.sessionInfo.userCountry = info.country.isoCode;
                socket.handshake.query.sessionInfo.userCity = info.city.names.en;
                socket.handshake.query.sessionInfo.userState = info.subdivisions.length > 0 ? info.subdivisions[0].names.en : null;
            } catch (e) {
                logger.debug(`geoip-country failed: ${e}`);
            }
        }
    }
}

function socketConnexionTimeout(io) {
    if (process.env.CLEAR_SOCKET_TIME !== undefined && parseFloat(process.env.CLEAR_SOCKET_TIME) > 0) {
        const CLEAR_SOCKET_TIME = parseFloat(process.env.CLEAR_SOCKET_TIME);
        logger.info(`WS manually disconnecting sockets after ${CLEAR_SOCKET_TIME} min`);
        setInterval(async (io) => {
            try {
                const now = new Date();
                let allSockets = await io.fetchSockets();
                for (let socket of allSockets) {
                    if (socket._connectedAt !== undefined && ((now - socket._connectedAt) / 1000) / 60 > CLEAR_SOCKET_TIME) {
                        logger.debug(`disconnecting ${socket.id} after more than ${CLEAR_SOCKET_TIME} of connexion.`);
                        socket.disconnect();
                    }
                }
            } catch (e) {
                logger.error(`Error while disconnecting sockets: ${e}`);
            }
        }, 0.5 * 60 * 1000, io);
    } else {
        logger.info(`WS no manually disconnecting sockets.`);
    }
}

function errorHandler(listenerName, error) {
    logger.error(`Error detected from ${listenerName}\n${error}`);
}

function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.ASSIST_JWT_SECRET, {expiresIn: process.env.ASSIST_JWT_EXPIRATION || '30m'});
}

const JWT_TOKEN_PREFIX = "Bearer ";

function check(socket, next) {
    if (socket.handshake.query.identity === IDENTITIES.session) {
        return next();
    }
    if (socket.handshake.query.peerId && socket.handshake.auth && socket.handshake.auth.token) {
        let token = socket.handshake.auth.token;
        if (token.startsWith(JWT_TOKEN_PREFIX)) {
            token = token.substring(JWT_TOKEN_PREFIX.length);
        }
        jwt.verify(token, process.env.ASSIST_JWT_SECRET, (err, decoded) => {
            logger.debug(`JWT payload: ${decoded}`);
            if (err) {
                logger.debug(err);
                return next(new Error('Authentication error'));
            }
            const {projectKey, sessionId} = extractPeerId(socket.handshake.query.peerId);
            if (!projectKey || !sessionId) {
                logger.debug(`Missing attribute: projectKey:${projectKey}, sessionId:${sessionId}`);
                return next(new Error('Authentication error'));
            }
            if (String(projectKey) !== String(decoded.projectKey) || String(sessionId) !== String(decoded.sessionId)) {
                logger.debug(`Trying to access projectKey:${projectKey} instead of ${decoded.projectKey} or
                 to sessionId:${sessionId} instead of ${decoded.sessionId}`);
                return next(new Error('Authorization error'));
            }
            socket.decoded = decoded;
            return next();
        });
    } else {
        logger.debug(`something missing in handshake: ${socket.handshake}`);
        return next(new Error('Authentication error'));
    }
}

module.exports = {
    extractSessionInfo,
    EVENTS_DEFINITION,
    IDENTITIES,
    socketConnexionTimeout,
    errorHandler,
    authorizer: {generateAccessToken, check}
};