const {
    hasFilters,
    hasQuery,
    isValidSession,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete
} = require("./helper");
const {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
} = require("./extractors");
const {
    RecordRequestDuration,
    IncreaseTotalRequests
} = require('../utils/metrics');
const {fetchSockets} = require("./wsServer");
const {IDENTITIES} = require("./assistHelper");

const debug_log = process.env.debug === "1";

const respond = function (req, res, data) {
    debug_log && console.log("responding with data: ", JSON.stringify(data))
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

const getParticularSession = async function (roomId, filters) {
    let connected_sockets = await fetchSockets(roomId);
    if (connected_sockets.length === 0) {
        return null;
    }
    let sessInfo;
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
            sessInfo = item.handshake.query.sessionInfo;
            break;
        }
    }
    if (!sessInfo) {
        return null;
    }
    if (!hasFilters(filters)) {
        return sessInfo;
    }
    if (isValidSession(sessInfo, filters.filter)) {
        return sessInfo;
    }
    return null;
}

const getAllSessions = async  function (projectKey, filters, onlineOnly= false) {
    const sessions = [];
    const connected_sockets = await fetchSockets();
    if (connected_sockets.length === 0) {
        return sessions;
    }

    const rooms = new Map();
    for (let item of connected_sockets) {
        // Prefilter checks
        if (rooms.has(item.handshake.query.roomId)) {
            continue;
        }
        if (item.handshake.query.projectKey !== projectKey || !item.handshake.query.sessionInfo) {
            continue;
        }
        if (onlineOnly && item.handshake.query.identity !== IDENTITIES.session) {
            continue;
        }

        // Mark this room as visited
        rooms.set(item.handshake.query.roomId, true);

        // Add session to the list without filtering
        if (!hasFilters(filters)) {
            sessions.push(item.handshake.query.sessionInfo);
            continue;
        }

        // Add session to the list if it passes the filter
        if (isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
            sessions.push(item.handshake.query.sessionInfo);
        }
    }

    return sessions
}

// Sort by projectKey
const socketsListByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available sessions");
    res.handlerName = 'socketsListByProject';

    const _projectKey = extractProjectKeyFromRequest(req);
    const _sessionId = extractSessionIdFromRequest(req);
    const filters = await extractPayloadFromRequest(req, res);

    // find a particular session
    if (_sessionId) {
        const sessInfo = await getParticularSession(`${_projectKey}-${_sessionId}`, filters);
        return respond(req, res, sessInfo);
    }

    // find all sessions for a project
    const sessions = await getAllSessions(_projectKey, filters);

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by projectKey
const socketsLiveByProject = async function (req, res) {
    debug_log && console.log("[WS]looking for available LIVE sessions");
    res.handlerName = 'socketsLiveByProject';

    const _projectKey = extractProjectKeyFromRequest(req);
    const _sessionId = extractSessionIdFromRequest(req);
    const filters = await extractPayloadFromRequest(req, res);

    // find a particular session
    if (_sessionId) {
        let sessInfo = await getParticularSession(`${_projectKey}-${_sessionId}`, filters);
        return respond(req, res, sessInfo);
    }

    // find all sessions for a project
    const sessions = await getAllSessions(_projectKey, filters, true);

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by roomID (projectKey+sessionId)
const socketsLiveBySession = async function (req, res) {
    debug_log && console.log("[WS]looking for LIVE session");
    res.handlerName = 'socketsLiveBySession';

    const _projectKey = extractProjectKeyFromRequest(req);
    const _sessionId = extractSessionIdFromRequest(req);
    const filters = await extractPayloadFromRequest(req, res);

    // find a particular session
    if (_sessionId) {
        let sessInfo = await getParticularSession(`${_projectKey}-${_sessionId}`, filters);
        return respond(req, res, sessInfo);
    }
    return respond(req, res, null);
}

// Sort by projectKey
const autocomplete = async function (req, res) {
    debug_log && console.log("[WS]autocomplete");
    res.handlerName = 'autocomplete';

    const _projectKey = extractProjectKeyFromRequest(req);
    const filters = await extractPayloadFromRequest(req);
    let results = [];
    if (!hasQuery(filters)) {
        return respond(req, res, results);
    }

    let connected_sockets = await fetchSockets();
    if (connected_sockets.length === 0) {
        return results;
    }

    const rooms = new Map();
    for (let item of connected_sockets) {
        if (rooms.has(item.handshake.query.roomId)) {
            continue;
        }
        if (item.handshake.query.sessionInfo) {
            if ((item.handshake.query.projectKey !== _projectKey) || (item.handshake.query.identity !== IDENTITIES.session)) {
                continue;
            }
            // Mark this room as visited
            rooms.set(item.handshake.query.roomId, true);
            results.push(...getValidAttributes(item.handshake.query.sessionInfo, filters.query))
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