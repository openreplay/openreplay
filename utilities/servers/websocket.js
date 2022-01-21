const _io = require('socket.io');
var express = require('express');
var {extractPeerId} = require('./peerjs-server');
var wsRouter = express.Router();
const IDENTITIES = {agent: 'agent', session: 'session'};
const NEW_AGENT_MESSAGE = "NEW_AGENT";
const NO_AGENTS = "NO_AGENT";
const NO_SESSIONS = "SESSION_DISCONNECTED";
const SESSION_ALREADY_CONNECTED = "SESSION_ALREADY_CONNECTED";
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
};

const findSessionSocketId = async (io, peerId) => {
    const connected_sockets = await io.in(peerId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session) {
            return item.id;
        }
    }
    return null;
};

module.exports = {
    wsRouter,
    start: (server) => {
        const io = _io(server, {
            maxHttpBufferSize: 7e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"]
            },
            path: '/socket'
        });

        io.on('connection', async (socket) => {
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
                let sessionSocketId = await findSessionSocketId(io, socket.peerId);
                if (sessionSocketId !== null) {
                    console.log(`session already connected, refusing new connexion`);
                    io.to(socket.id).emit(SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
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
                console.log("wait ended, checking for number of connected agentants and sessions");
                if (io.sockets.adapter.rooms.get(socket.peerId)) {
                    const connected_sockets = await io.in(socket.peerId).fetchSockets();
                    let c_sessions = 0, c_agentants = 0;
                    for (let item of connected_sockets) {
                        if (item.handshake.query.identity === IDENTITIES.session) {
                            c_sessions++;
                        } else {
                            c_agentants++;
                        }
                    }
                    if (c_sessions === 0) {
                        console.log(`notifying everyone in ${socket.peerId} about no SESSIONS`);
                        socket.to(socket.peerId).emit(NO_SESSIONS);
                        removeSession(socket.projectKey, socket.sessionId);
                    }
                    if (c_agentants === 0) {
                        console.log(`notifying everyone in ${socket.peerId} about no AGENTS`);
                        socket.to(socket.peerId).emit(NO_AGENTS);
                    }
                } else {
                    console.log(`room not found: ${socket.peerId}`);
                    removeSession(socket.projectKey, socket.sessionId);
                }
                // }, wsReconnectionTimeout);
            });

            socket.onAny(async (eventName, ...args) => {
                socket.lastMessageReceivedAt = Date.now();
                if (socket.identity === IDENTITIES.session) {
                    console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.peerId}, size: ${io.sockets.adapter.rooms.get(socket.peerId).size}`);
                    socket.to(socket.peerId).emit(eventName, args[0]);
                } else {
                    console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.peerId}, size:${io.sockets.adapter.rooms.get(socket.peerId).size}`);
                    let socketId = await findSessionSocketId(io, socket.peerId);
                    if (socketId === null) {
                        console.log(`session not found for:${socket.peerId}`);
                        io.to(socket.id).emit(NO_SESSIONS);
                    } else {
                        console.log("message sent");
                        io.to(socketId).emit(eventName, args[0]);
                    }
                }
            });

            if (socket.identity === IDENTITIES.agent) {
                socket.to(socket.peerId).emit(NEW_AGENT_MESSAGE);
            }
        });
    }
};