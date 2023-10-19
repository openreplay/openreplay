const express = require('express');
const {
    extractPeerId,
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    hasFilters,
    isValidSession,
    extractPayloadFromRequest,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete,
    getAvailableRooms,
} = require('../utils/helper');
const {
    IDENTITIES,
    socketConnexionTimeout,
    authorizer
} = require('../utils/assistHelper');
const {
    onConnect
} = require('../utils/socketHandlers');
const {
    createSocketIOServer
} = require('../utils/wsServer');

let io;

const wsRouter = express.Router();

const debug_log = process.env.debug === "1";

const respond = function (res, data) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": data}));
}

const socketsList = async function (req, res) {
    debug_log && console.log("[WS]looking for all available sessions");
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey !== undefined) {
            liveSessionsPerProject[projectKey] = liveSessionsPerProject[projectKey] || new Set();
            if (withFilters) {
                const connected_sockets = await io.in(roomId).fetchSockets();
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
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            if (withFilters) {
                const connected_sockets = await io.in(roomId).fetchSockets();
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
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessionsPerProject[projectKey] = liveSessionsPerProject[projectKey] || new Set();
                    if (withFilters) {
                        if (item.handshake.query.sessionInfo && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                            liveSessionsPerProject[projectKey].add(item.handshake.query.sessionInfo);
                        }
                    } else {
                        liveSessionsPerProject[projectKey].add(item.handshake.query.sessionInfo);
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
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    const sessIDs = new Set();
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            let connected_sockets = await io.in(roomId).fetchSockets();
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
        console.log(`ws.start: ${io}`)
        io.use(async (socket, next) => await authorizer.check(socket, next));
        io.on('connection', (socket) => onConnect(socket));

        console.log("WS server started");
        setInterval(async (io) => {
            try {
                let count = 0;
                const rooms = await getAvailableRooms(io);
                console.log(` ====== Rooms: ${rooms.size} ====== `);
                const arr = Array.from(rooms);
                const filtered = arr.filter(room => !room[1].has(room[0]));
                for (let i of filtered) {
                    let {projectKey, sessionId} = extractPeerId(i[0]);
                    if (projectKey !== null && sessionId !== null) {
                        count++;
                    }
                }
                console.log(` ====== Valid Rooms: ${count} ====== `);
                if (debug_log) {
                    for (let item of filtered) {
                        console.log(`Room: ${item[0]} connected: ${item[1].size}`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 30000, io);

        socketConnexionTimeout(io);
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject
    }
};
