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
const {
    GetRoomInfo,
    GetRooms,
    GetSessions,
} = require('../utils/rooms');

const debug_log = process.env.debug === "1";

const respond = function (req, res, data) {
    console.log("responding with data: ", data)
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

const getParticularSession = function (sessionId, filters) {
    const sessInfo = GetRoomInfo(sessionId);
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

const getAllSessions = function (projectKey, filters, onlineOnly= false) {
    const sessions = [];
    const allRooms = onlineOnly ? GetSessions(projectKey) : GetRooms(projectKey);

    for (let sessionId of allRooms) {
        let sessInfo = GetRoomInfo(sessionId);
        if (!sessInfo) {
            continue;
        }
        if (!hasFilters(filters)) {
            sessions.push(sessInfo);
            continue;
        }
        if (isValidSession(sessInfo, filters.filter)) {
            sessions.push(sessInfo);
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
        return respond(req, res, getParticularSession(_sessionId, filters));
    }

    // find all sessions for a project
    const sessions = getAllSessions(_projectKey, filters);

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
        return respond(req, res, getParticularSession(_sessionId, filters));
    }

    // find all sessions for a project
    const sessions = getAllSessions(_projectKey, filters, true);

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by roomID (projectKey+sessionId)
const socketsLiveBySession = async function (req, res) {
    debug_log && console.log("[WS]looking for LIVE session");
    res.handlerName = 'socketsLiveBySession';

    const _sessionId = extractSessionIdFromRequest(req);
    const filters = await extractPayloadFromRequest(req, res);

    // find a particular session
    if (_sessionId) {
        return respond(req, res, getParticularSession(_sessionId, filters));
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
    let allSessions = GetSessions(_projectKey);
    for (let sessionId of allSessions) {
        let sessInfo = GetRoomInfo(sessionId);
        if (!sessInfo) {
            continue;
        }
        results = [...results, ...getValidAttributes(sessInfo, filters.query)];
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