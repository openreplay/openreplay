const express = require('express');
const {
    extractPeerId,
    hasFilters,
    isValidSession,
    sortPaginate,
} = require('../utils/helper');
const {
    IDENTITIES,
    socketConnexionTimeout,
    authorizer
} = require('../utils/assistHelper');
const {
    extractPayloadFromRequest,
    getAvailableRooms
} = require('../utils/helper-ee');
const {
    createSocketIOServer
} = require('../utils/wsServer');
const {
    onConnect
} = require('../utils/socketHandlers');
const {
    respond,
    socketsList,
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
} = require('../utils/httpHandlers');

const {createAdapter} = require("@socket.io/redis-adapter");
const {createClient} = require("redis");
const wsRouter = express.Router();
const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
const pubClient = createClient({url: REDIS_URL});
const subClient = pubClient.duplicate();
console.log(`Using Redis: ${REDIS_URL}`);
let io;
const debug_log = process.env.debug === "1";

const socketsLive = async function (req, res) {
    debug_log && console.log("[WS]looking for all available LIVE sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    const sessIDs = new Set();
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey} = extractPeerId(roomId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(roomId).fetchSockets();
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

        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => {
                io.adapter(createAdapter(pubClient, subClient,
                    {requestsTimeout: process.env.REDIS_REQUESTS_TIMEOUT || 5000}));
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
        socketsLiveBySession,
        autocomplete
    }
};