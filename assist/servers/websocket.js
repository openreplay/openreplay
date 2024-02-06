const express = require('express');
const {
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
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
} = require('../utils/httpHandlers');

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
    },
    handlers: {
        socketsListByProject,
        socketsLiveByProject,
        socketsLiveBySession
    }
};