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
const {
    RecordRequestDuration,
    IncreaseTotalRequests
} = require('../utils/metrics');
const {
    GetRoomInfo,
    GetRooms,
    GetSessions,
} = require('../utils/rooms');

const debug_log = process.env.debug === "1";

const respond = function (req, res, data) {
    let result = {data}
    if (process.env.uws !== "true") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
    } else {
        res.writeStatus('200 OK').writeHeader('Content-Type', 'application/json').end(JSON.stringify(result));
    }
    const duration = performance.now() - req.startTs;
    IncreaseTotalRequests();
    RecordRequestDuration(req.method.toLowerCase(), res.handlerName, 200, duration/1000.0);
}

// Sort by projectKey
const socketsListByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available sessions");
    res.handlerName = 'socketsListByProject';

    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);

    // find a particular session
    if (_sessionId) {
        let sessInfo = GetRoomInfo(_sessionId);
        if (!sessInfo) {
            return respond(req, res, null);
        }
        if (!withFilters) {
            return respond(req, res, sessInfo);
        }
        if (isValidSession(sessInfo, filters.filter)) {
            return respond(req, res, sessInfo);
        }
        return respond(req, res, null);
    }

    // find all sessions for a project
    let sessions = [];
    let allRooms = GetRooms(_projectKey);
    for (let sessionId of allRooms) {
        let sessInfo = GetRoomInfo(sessionId);
        if (!sessInfo) {
            continue;
        }
        if (!withFilters) {
            sessions.push(sessInfo);
            continue;
        }
        if (isValidSession(sessInfo, filters.filter)) {
            sessions.push(sessInfo);
        }
    }

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by projectKey
const socketsLiveByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available LIVE sessions");
    res.handlerName = 'socketsLiveByProject';

    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);

    // find a particular session
    if (_sessionId) {
        let sessInfo = GetRoomInfo(_sessionId);
        if (!sessInfo) {
            return respond(req, res, null);
        }
        if (!withFilters) {
            return respond(req, res, sessInfo);
        }
        if (isValidSession(sessInfo, filters.filter)) {
            return respond(req, res, sessInfo);
        }
        return respond(req, res, null);
    }

    // find all sessions for a project
    let sessions = [];
    let allSessions = GetSessions(_projectKey);
    for (let sessionId of allSessions) {
        let sessInfo = GetRoomInfo(sessionId);
        if (!sessInfo) {
            continue;
        }
        if (!withFilters) {
            sessions.push(sessInfo);
            continue;
        }
        if (isValidSession(sessInfo, filters.filter)) {
            sessions.push(sessInfo);
        }
    }

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by roomID (projectKey+sessionId)
const socketsLiveBySession = async function (req, res) {
    res.handlerName = 'socketsLiveBySession';
    let io = getServer();
    debug_log && console.log("[WS]looking for LIVE session");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    if (_sessionId === undefined) {
        return respond(req, res, null);
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
    respond(req, res, sessions.length > 0 ? sessions[0] : null);
}

// Sort by projectKey
const autocomplete = async function (req, res) {
    res.handlerName = 'autocomplete';
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
    respond(req, res, uniqueAutocomplete(results));
}

module.exports = {
    respond,
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
}