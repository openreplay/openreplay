const {
    hasFilters,
    extractPeerId,
    isValidSession,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete
} = require("./helper");
const {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
    getAvailableRooms
} = require("./extractors");
const {
    IDENTITIES
} = require("./assistHelper");
const {
    getServer
} = require('../utils/wsServer');

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
    let io = getServer();
    debug_log && console.log("[WS]looking for all available sessions");
    let filters = await extractPayloadFromRequest(req, res);
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
    let io = getServer();
    debug_log && console.log("[WS]looking for available sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
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

const socketsLiveByProject = async function (req, res) {
    let io = getServer();
    debug_log && console.log("[WS]looking for available LIVE sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
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

const socketsLiveBySession = async function (req, res) {
    let io = getServer();
    debug_log && console.log("[WS]looking for LIVE session");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    if (_sessionId === undefined) {
        return respond(res, null);
    }
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    const sessIDs = new Set();

    let connected_sockets = await io.in(_projectKey + '-' + _sessionId).fetchSockets();
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
    let sessions = Array.from(liveSessions);
    respond(res, sessions.length > 0 ? sessions[0] : null);
}

const autocomplete = async function (req, res) {
    let io = getServer();
    debug_log && console.log("[WS]autocomplete");
    let _projectKey = extractProjectKeyFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let results = [];
    if (filters.query && Object.keys(filters.query).length > 0) {
        let rooms = await getAvailableRooms(io);
        for (let roomId of rooms.keys()) {
            let {projectKey} = extractPeerId(roomId);
            if (projectKey === _projectKey) {
                let connected_sockets = await io.in(roomId).fetchSockets();
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

module.exports = {
    respond,
    socketsList,
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
}