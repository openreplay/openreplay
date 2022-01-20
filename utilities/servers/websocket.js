const _io = require('socket.io');
var express = require('express');
var {extractPeerId} = require('./peerjs-server');
var wsRouter = express.Router();
const IDENTITIES = {assist: 'agent', session: 'session'};
const NEW_ASSIST_MESSAGE = "NEW_AGENT";
const NO_ASSISTS = "NO_AGENT";
const NO_SESSIONS = "SESSION_DISCONNECTED";
const wsReconnectionTimeout = process.env.wsReconnectionTimeout | 10 * 1000;

let connectedSessions = {};


wsRouter.get(`/${process.env.S3_KEY}/sockets-list`, function (req, res) {
    console.log("[WS]looking for all available sessions");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedSessions}));
});
wsRouter.get(`/${process.env.S3_KEY}/sockets-list/:projectKey`, function (req, res) {
    console.log(`[WS]looking for available sessions for ${req.params.projectKey}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedSessions[req.params.projectKey] || []}));
});

const removeSession = (projectKey, sessionId) => {
    const i = (connectedSessions[projectKey] || []).indexOf(sessionId);
    if (i !== -1) {
        connectedSessions[projectKey].splice(i, 1);
    }
}

module.exports = {
    wsRouter,
    start: (server) => {
        const io = _io(server, {
            cors: {
                origin: "*",
                // methods: ["GET", "POST", "PUT"]
            },
            path: '/assist/socket'
        });

        io.on('connection', (socket) => {
            console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
            socket.peerId = socket.handshake.query.peerId;
            socket.identity = socket.handshake.query.identity;
            const {projectKey, sessionId} = extractPeerId(socket.peerId);
            socket.sessionId = sessionId;
            socket.projectKey = projectKey;
            socket.lastMessageReceivedAt = Date.now();
            if (socket.identity === IDENTITIES.session) {
                connectedSessions[socket.projectKey] = connectedSessions[socket.projectKey] || [];
                if (!connectedSessions[socket.projectKey].includes(socket.sessionId)) {
                    connectedSessions[socket.projectKey].push(socket.sessionId);
                }
            }
            socket.join(socket.peerId);
            if (io.sockets.adapter.rooms.get(socket.peerId)) {
                console.log(`${socket.id} joined room:${socket.peerId}, as:${socket.identity}, size:${io.sockets.adapter.rooms.get(socket.peerId).size}`);
            }

            socket.on('disconnect', async () => {
                // console.log(`${socket.id} disconnected from ${socket.peerId}, waiting ${wsReconnectionTimeout / 1000}s before checking remaining`);
                console.log(`${socket.id} disconnected from ${socket.peerId}`);
                // wait a little bit before notifying everyone
                // setTimeout(async () => {
                console.log("wait ended, checking for number of connected assistants and sessions");
                if (io.sockets.adapter.rooms.get(socket.peerId)) {
                    const connected_sockets = await io.in(socket.peerId).fetchSockets();
                    let c_sessions = 0, c_assistants = 0;
                    for (let item of connected_sockets) {
                        if (item.handshake.query.identity === IDENTITIES.session) {
                            c_sessions++;
                        } else {
                            c_assistants++;
                        }
                    }
                    if (c_sessions === 0) {
                        console.log(`notifying everyone in ${socket.peerId} about no SESSIONS`);
                        socket.to(socket.peerId).emit(NO_SESSIONS);
                        removeSession(socket.projectKey, socket.sessionId);
                    }
                    if (c_assistants === 0) {
                        console.log(`notifying everyone in ${socket.peerId} about no ASSISNTANT`);
                        socket.to(socket.peerId).emit(NO_ASSISTS);
                    }
                } else {
                    console.log(`room not found: ${socket.peerId}`);
                    removeSession(socket.projectKey, socket.sessionId);
                }
                // }, wsReconnectionTimeout);
            });

            socket.onAny((eventName, ...args) => {
                socket.lastMessageReceivedAt = Date.now();
                console.log("received event:" + eventName + ", from:" + socket.identity + ", sending message to room:" + socket.peerId + ", size:" + io.sockets.adapter.rooms.get(socket.peerId).size);
                if(socket.identity===IDENTITIES.session){
                    socket.to(socket.peerId).emit(eventName, args[0]);
                }else{

                }
            });

            if (socket.identity === IDENTITIES.assist) {
                socket.to(socket.peerId).emit(NEW_ASSIST_MESSAGE);
            }
        });
    }
};