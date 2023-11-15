const express = require('express');
const {
    extractPeerId,
    hasFilters,
    isValidSession,
    extractPayloadFromRequest,
    sortPaginate,
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
const {
    respond,
    socketsList,
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
} = require('../utils/httpHandlers');

let io;

const wsRouter = express.Router();

const debug_log = process.env.debug === "1";

const socketsLive = async function (req, res) {
    res.handlerName = 'socketsLive';
    debug_log && console.log("[WS]looking for all available LIVE sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey} = extractPeerId(roomId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(roomId).fetchSockets();
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
    respond(req, res, sortPaginate(liveSessions, filters));
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
wsRouter.get(`/sockets-live/:projectKey/:sessionId`, socketsLiveBySession);

module.exports = {
    wsRouter,
    start: (server, prefix) => {
        io = createSocketIOServer(server, prefix);
        io.use(async (socket, next) => await authorizer.check(socket, next));
        io.on('connection', (socket) => onConnect(socket));

        console.log("WS server started");

        socketConnexionTimeout(io);
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject,
        socketsLiveBySession
    }
};
