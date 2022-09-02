const uaParser = require('ua-parser-js');
const {geoip} = require('./geoIP');

let debug = process.env.debug === "1" || false;
const IDENTITIES = {agent: 'agent', session: 'session'};
const EVENTS_DEFINITION = {
    listen: {
        UPDATE_EVENT: "UPDATE_SESSION",
        CONNECT_ERROR: "connect_error",
        CONNECT_FAILED: "connect_failed",
        ERROR: "error"
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

function socketConnexionTimeout(io) {
    if (process.env.CLEAR_SOCKET_TIME !== undefined && parseFloat(process.env.CLEAR_SOCKET_TIME) > 0) {
        const CLEAR_SOCKET_TIME = parseFloat(process.env.CLEAR_SOCKET_TIME);
        console.log(`WS manually disconnecting sockets after ${CLEAR_SOCKET_TIME} min`);
        setInterval(async (io) => {
            try {
                const now = new Date();
                let allSockets = await io.fetchSockets();
                for (let socket of allSockets) {
                    if (socket._connectedAt !== undefined && ((now - socket._connectedAt) / 1000) / 60 > CLEAR_SOCKET_TIME) {
                        debug && console.log(`disconnecting ${socket.id} after more than ${CLEAR_SOCKET_TIME} of connexion.`);
                        socket.disconnect();
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 0.5 * 60 * 1000, io);
        // }, 2.5 * 60 * 1000, io);
    } else {
        debug && console.log(`WS no manually disconnecting sockets.`);
    }
}

function errorHandler(listenerName, error) {
    console.error(`Error detected from ${listenerName}`);
    console.error(error);
}

module.exports = {
    extractSessionInfo, EVENTS_DEFINITION, IDENTITIES, socketConnexionTimeout, errorHandler
};