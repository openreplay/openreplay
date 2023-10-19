const express = require('express');
const {
    extractPeerId,
    hasFilters,
    isValidSession,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete
} = require('../utils/helper');
const {
    IDENTITIES,
    socketConnexionTimeout,
    authorizer
} = require('../utils/assistHelper');
const {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
    getAvailableRooms
} = require('../utils/helper-ee');
const {
    createSocketIOServer
} = require('../utils/wsServer');
const {
    onConnect
} = require('../utils/socketHandlers');

const {createAdapter} = require("@socket.io/redis-adapter");
const {createClient} = require("redis");
const wsRouter = express.Router();
const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
const pubClient = createClient({url: REDIS_URL});
const subClient = pubClient.duplicate();
console.log(`Using Redis: ${REDIS_URL}`);
let io;
const debug_log = process.env.debug === "1";

const respond = function (res, data) {
    let result = {data}
    if (process.env.uws !== "true") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
    } else {
        res.writeStatus('200 OK').writeHeader('Content-Type', 'application/json').end(JSON.stringify(result));
    }
}

const socketsList = async function (req, res) {
    debug_log && console.log("[WS]looking for all available sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            liveSessionsPerProject[projectKey] = liveSessionsPerProject[projectKey] || new Set();
            if (withFilters) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessionsPerProject[projectKey].add(sessionId);
                    }
                }
            } else {
                liveSessionsPerProject[projectKey].add(sessionId);
            }
        }
    }
    let liveSessions = {};
    liveSessionsPerProject.forEach((sessions, projectId) => {
        liveSessions[projectId] = Array.from(sessions);
    });
    respond(res, liveSessions);
}

const socketsListByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            if (withFilters) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessions.add(sessionId);
                    }
                }
            } else {
                liveSessions.add(sessionId);
            }
        }
    }
    let sessions = Array.from(liveSessions);
    respond(res, _sessionId === undefined ? sortPaginate(sessions, filters)
        : sessions.length > 0 ? sessions[0]
            : null);
}

const socketsLive = async function (req, res) {
    debug_log && console.log("[WS]looking for all available LIVE sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    const sessIDs = new Set();
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessionsPerProject[projectKey] = liveSessionsPerProject[projectKey] || new Set();
                    if (withFilters) {
                        if (item.handshake.query.sessionInfo &&
                            isValidSession(item.handshake.query.sessionInfo, filters.filter) &&
                            !sessIDs.has(item.handshake.query.sessionInfo.sessionID)
                        ) {
                            liveSessionsPerProject[projectKey].add(item.handshake.query.sessionInfo);
                            sessIDs.add(item.handshake.query.sessionInfo.sessionID);
                        }
                    } else {
                        if (!sessIDs.has(item.handshake.query.sessionInfo.sessionID)) {
                            liveSessionsPerProject[projectKey].add(item.handshake.query.sessionInfo);
                            sessIDs.add(item.handshake.query.sessionInfo.sessionID);
                        }
                    }
                }
            }
        }
    }
    let liveSessions = {};
    liveSessionsPerProject.forEach((sessions, projectId) => {
        liveSessions[projectId] = Array.from(sessions);
    });
    respond(res, sortPaginate(liveSessions, filters));
}

const socketsLiveByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available LIVE sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    const sessIDs = new Set();
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    if (withFilters) {
                        if (item.handshake.query.sessionInfo &&
                            isValidSession(item.handshake.query.sessionInfo, filters.filter) &&
                            !sessIDs.has(item.handshake.query.sessionInfo.sessionID)
                        ) {
                            liveSessions.add(item.handshake.query.sessionInfo);
                            sessIDs.add(item.handshake.query.sessionInfo.sessionID);
                        }
                    } else {
                        if (!sessIDs.has(item.handshake.query.sessionInfo.sessionID)) {
                            liveSessions.add(item.handshake.query.sessionInfo);
                            sessIDs.add(item.handshake.query.sessionInfo.sessionID);
                        }
                    }
                }
            }
        }
    }
    let sessions = Array.from(liveSessions);
    respond(res, _sessionId === undefined ? sortPaginate(sessions, filters) : sessions.length > 0 ? sessions[0] : null);
}

const autocomplete = async function (req, res) {
    debug_log && console.log("[WS]autocomplete");
    let _projectKey = extractProjectKeyFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let results = [];
    if (filters.query && Object.keys(filters.query).length > 0) {
        let rooms = await getAvailableRooms(io);
        for (let peerId of rooms.keys()) {
            let {projectKey} = extractPeerId(peerId);
            if (projectKey === _projectKey) {
                let connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
                        results = [...results, ...getValidAttributes(item.handshake.query.sessionInfo, filters.query)];
                    }
                }
            }
        }
    }
    respond(res, uniqueAutocomplete(results));
}

wsRouter.get(`/sockets-list`, socketsList);
wsRouter.post(`/sockets-list`, socketsList);
wsRouter.get(`/sockets-list/:projectKey/autocomplete`, autocomplete);
wsRouter.get(`/sockets-list/:projectKey`, socketsListByProject);
wsRouter.post(`/sockets-list/:projectKey`, socketsListByProject);
wsRouter.get(`/sockets-list/:projectKey/:sessionId`, socketsListByProject);

wsRouter.get(`/sockets-live`, socketsLive);
wsRouter.post(`/sockets-live`, socketsLive);
wsRouter.get(`/sockets-live/:projectKey/autocomplete`, autocomplete);
wsRouter.get(`/sockets-live/:projectKey`, socketsLiveByProject);
wsRouter.post(`/sockets-live/:projectKey`, socketsLiveByProject);
wsRouter.get(`/sockets-live/:projectKey/:sessionId`, socketsLiveByProject);

module.exports = {
    wsRouter,
    start: (server, prefix) => {
        io = createSocketIOServer(server, prefix);
        io.use(async (socket, next) => await authorizer.check(socket, next));
        io.on('connection', (socket) => onConnect(socket));

        console.log("WS server started");
        setInterval(async (io) => {
            try {
                const rooms = await getAvailableRooms(io);
                let validRooms = [];
                console.log(` ====== Rooms: ${rooms.size} ====== `);
                for (let i of rooms) {
                    let {projectKey, sessionId} = extractPeerId(i);
                    if (projectKey !== undefined && sessionId !== undefined) {
                        validRooms.push(i);
                    }
                }
                console.log(` ====== Valid Rooms: ${validRooms.length} ====== `);
                if (debug_log) {
                    for (let item of validRooms) {
                        let connectedSockets = await io.in(item).fetchSockets();
                        console.log(`Room: ${item} connected: ${connectedSockets.length}`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 30000, io);

        socketConnexionTimeout(io);

        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => {
                io.adapter(createAdapter(pubClient, subClient));
                console.log("> redis connected.");
            })
            .catch((err) => {
                console.log("> redis connection error");
                debug_log && console.error(err);
                process.exit(2);
            });
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject,
        autocomplete
    }
};