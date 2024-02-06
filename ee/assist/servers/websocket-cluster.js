const express = require('express');
const {
    socketConnexionTimeout,
    authorizer
} = require('../utils/assistHelper');
const {
    createSocketIOServer
} = require('../utils/wsServer');
const {
    onConnect
} = require('../utils/socketHandlers');
const {
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
} = require('../utils/httpHandlers');

const {createAdapter} = require("@socket.io/redis-adapter");
const {createClient} = require("redis");
const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
const pubClient = createClient({url: REDIS_URL});
const subClient = pubClient.duplicate();
console.log(`Using Redis: ${REDIS_URL}`);

const debug_log = process.env.debug === "1";

const wsRouter = express.Router();
wsRouter.get(`/sockets-list/:projectKey/autocomplete`, autocomplete); // autocomplete
wsRouter.get(`/sockets-list/:projectKey/:sessionId`, socketsListByProject); // is_live
wsRouter.get(`/sockets-live/:projectKey/autocomplete`, autocomplete); // not using
wsRouter.get(`/sockets-live/:projectKey`, socketsLiveByProject);
wsRouter.post(`/sockets-live/:projectKey`, socketsLiveByProject); // assist search
wsRouter.get(`/sockets-live/:projectKey/:sessionId`, socketsLiveBySession); // session_exists, get_live_session_by_id

let io;
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
        socketsListByProject,
        socketsLiveByProject,
        socketsLiveBySession,
        autocomplete
    }
};