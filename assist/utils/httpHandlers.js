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
    IDENTITIES
} = require("./assistHelper");
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
    console.log("sessions: ", sessions);
    console.log("filters: ", filters);

    // send response
    respond(req, res, sortPaginate(sessions, filters));
}

// Sort by roomID (projectKey+sessionId)
const socketsLiveBySession = async function (req, res) {
    debug_log && console.log("[WS]looking for LIVE session");
    res.handlerName = 'socketsLiveBySession';

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
    }
    return respond(req, res, null);
}

// Sort by projectKey
const autocomplete = async function (req, res) {
    debug_log && console.log("[WS]autocomplete");
    res.handlerName = 'autocomplete';

    let _projectKey = extractProjectKeyFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
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