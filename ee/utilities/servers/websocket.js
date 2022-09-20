const _io = require('socket.io');
const express = require('express');
const {
    extractPeerId,
    hasFilters,
    isValidSession,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete
} = require('../utils/helper');
const {
    IDENTITIES,
    EVENTS_DEFINITION,
    extractSessionInfo,
    socketConnexionTimeout,
    errorHandler
} = require('../utils/assistHelper');
const {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
} = require('../utils/helper-ee');
const wsRouter = express.Router();

let io;
const debug = process.env.debug === "1";

const createSocketIOServer = function (server, prefix) {
    if (process.env.uws !== "true") {
        io = _io(server, {
            maxHttpBufferSize: (parseInt(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"]
            },
            path: (prefix ? prefix : '') + '/socket'
        });
    } else {
        io = new _io.Server({
            maxHttpBufferSize: (parseInt(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"]
            },
            path: (prefix ? prefix : '') + '/socket'
            // transports: ['websocket'],
            // upgrade: false
        });
        io.attachApp(server);
    }
}

const getAvailableRooms = async function () {
    return io.sockets.adapter.rooms.keys();
}

const respond = function (res, data) {
    let result = {data}
    if (process.env.uws !== "true") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
    } else {
        res.writeStatus('200 OK').writeHeader('Content-Type', 'application/json').end(JSON.stringify(result));
    }
}

const socketsList = async function (req, res) {
    debug && console.log("[WS]looking for all available sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            if (hasFilters(filters)) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessions[projectKey].push(sessionId);
                    }
                }
            } else {
                liveSessions[projectKey].push(sessionId);
            }
        }
    }
    respond(res, liveSessions);
}

const socketsListByProject = async function (req, res) {
    debug && console.log("[WS]looking for available sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            if (hasFilters(filters)) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessions[projectKey].push(sessionId);
                    }
                }
            } else {
                liveSessions[projectKey].push(sessionId);
            }
        }
    }
    liveSessions[_projectKey] = liveSessions[_projectKey] || [];
    respond(res, _sessionId === undefined ? sortPaginate(liveSessions[_projectKey], filters)
        : liveSessions[_projectKey].length > 0 ? liveSessions[_projectKey][0]
            : null);
}

const socketsLive = async function (req, res) {
    debug && console.log("[WS]looking for all available LIVE sessions");
    let filters = await extractPayloadFromRequest(req, res);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    if (hasFilters(filters)) {
                        if (item.handshake.query.sessionInfo && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                            liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                        }
                    } else {
                        liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                    }
                }
            }
        }
    }
    respond(res, sortPaginate(liveSessions, filters));
}

const socketsLiveByProject = async function (req, res) {
    debug && console.log("[WS]looking for available LIVE sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req, res);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    if (hasFilters(filters)) {
                        if (item.handshake.query.sessionInfo && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                            liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                        }
                    } else {
                        liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                    }
                }
            }
        }
    }
    liveSessions[_projectKey] = liveSessions[_projectKey] || [];
    respond(res, _sessionId === undefined ? sortPaginate(liveSessions[_projectKey], filters)
        : liveSessions[_projectKey].length > 0 ? liveSessions[_projectKey][0]
            : null);
}

const autocomplete = async function (req, res) {
    debug && console.log("[WS]autocomplete");
    let _projectKey = extractProjectKeyFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let results = [];
    if (filters.query && Object.keys(filters.query).length > 0) {
        let rooms = await getAvailableRooms();
        for (let peerId of rooms) {
            let {projectKey} = extractPeerId(peerId);
            if (projectKey === _projectKey) {
                let connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
                        results = [...results, ...getValidAttributes(item.handshake.query.sessionInfo, filters.query)];
                    }
                }
            }
        }
    }
    respond(res, uniqueAutocomplete(results));
}

const findSessionSocketId = async (io, peerId) => {
    const connected_sockets = await io.in(peerId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session) {
            return item.id;
        }
    }
    return null;
};

async function sessions_agents_count(io, socket) {
    let c_sessions = 0, c_agents = 0;
    if (io.sockets.adapter.rooms.get(socket.peerId)) {
        const connected_sockets = await io.in(socket.peerId).fetchSockets();

        for (let item of connected_sockets) {
            if (item.handshake.query.identity === IDENTITIES.session) {
                c_sessions++;
            } else {
                c_agents++;
            }
        }
    } else {
        c_agents = -1;
        c_sessions = -1;
    }
    return {c_sessions, c_agents};
}

async function get_all_agents_ids(io, socket) {
    let agents = [];
    if (io.sockets.adapter.rooms.get(socket.peerId)) {
        const connected_sockets = await io.in(socket.peerId).fetchSockets();
        for (let item of connected_sockets) {
            if (item.handshake.query.identity === IDENTITIES.agent) {
                agents.push(item.id);
            }
        }
    }
    return agents;
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
wsRouter.get(`/sockets-live/:projectKey/:sessionId`, socketsLiveByProject);


module.exports = {
    wsRouter,
    start: (server, prefix) => {
        createSocketIOServer(server, prefix);
        io.on('connection', async (socket) => {
            socket.on(EVENTS_DEFINITION.listen.ERROR, err => errorHandler(EVENTS_DEFINITION.listen.ERROR, err));
            debug && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
            socket._connectedAt = new Date();
            socket.peerId = socket.handshake.query.peerId;
            socket.identity = socket.handshake.query.identity;
            let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
            if (socket.identity === IDENTITIES.session) {
                if (c_sessions > 0) {
                    debug && console.log(`session already connected, refusing new connexion`);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
                extractSessionInfo(socket);
                if (c_agents > 0) {
                    debug && console.log(`notifying new session about agent-existence`);
                    let agents_ids = await get_all_agents_ids(io, socket);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agents_ids);
                    socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
                }

            } else if (c_sessions <= 0) {
                debug && console.log(`notifying new agent about no SESSIONS`);
                io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
            }
            socket.join(socket.peerId);
            if (io.sockets.adapter.rooms.get(socket.peerId)) {
                debug && console.log(`${socket.id} joined room:${socket.peerId}, as:${socket.identity}, members:${io.sockets.adapter.rooms.get(socket.peerId).size}`);
            }
            if (socket.identity === IDENTITIES.agent) {
                if (socket.handshake.query.agentInfo !== undefined) {
                    socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
                }
                socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
            }

            socket.on('disconnect', async () => {
                debug && console.log(`${socket.id} disconnected from ${socket.peerId}`);
                if (socket.identity === IDENTITIES.agent) {
                    socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
                }
                debug && console.log("checking for number of connected agents and sessions");
                let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
                if (c_sessions === -1 && c_agents === -1) {
                    debug && console.log(`room not found: ${socket.peerId}`);
                }
                if (c_sessions === 0) {
                    debug && console.log(`notifying everyone in ${socket.peerId} about no SESSIONS`);
                    socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
                }
                if (c_agents === 0) {
                    debug && console.log(`notifying everyone in ${socket.peerId} about no AGENTS`);
                    socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
                }
            });

            socket.on(EVENTS_DEFINITION.listen.UPDATE_EVENT, async (...args) => {
                debug && console.log(`${socket.id} sent update event.`);
                if (socket.identity !== IDENTITIES.session) {
                    debug && console.log('Ignoring update event.');
                    return
                }
                socket.handshake.query.sessionInfo = {...socket.handshake.query.sessionInfo, ...args[0]};
                socket.to(socket.peerId).emit(EVENTS_DEFINITION.emit.UPDATE_EVENT, args[0]);
            });

            socket.on(EVENTS_DEFINITION.listen.CONNECT_ERROR, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_ERROR, err));
            socket.on(EVENTS_DEFINITION.listen.CONNECT_FAILED, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_FAILED, err));

            socket.onAny(async (eventName, ...args) => {
                if (Object.values(EVENTS_DEFINITION.listen).indexOf(eventName) >= 0) {
                    debug && console.log(`received event:${eventName}, should be handled by another listener, stopping onAny.`);
                    return
                }
                if (socket.identity === IDENTITIES.session) {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.peerId}`);
                    socket.to(socket.peerId).emit(eventName, args[0]);
                } else {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.peerId}`);
                    let socketId = await findSessionSocketId(io, socket.peerId);
                    if (socketId === null) {
                        debug && console.log(`session not found for:${socket.peerId}`);
                        io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
                    } else {
                        debug && console.log("message sent");
                        io.to(socketId).emit(eventName, socket.id, args[0]);
                    }
                }
            });

        });
        console.log("WS server started");
        setInterval(async (io) => {
            try {
                let count = 0;
                console.log(` ====== Rooms: ${io.sockets.adapter.rooms.size} ====== `);
                const arr = Array.from(io.sockets.adapter.rooms);
                const filtered = arr.filter(room => !room[1].has(room[0]));
                for (let i of filtered) {
                    let {projectKey, sessionId} = extractPeerId(i[0]);
                    if (projectKey !== null && sessionId !== null) {
                        count++;
                    }
                }
                console.log(` ====== Valid Rooms: ${count} ====== `);
                if (debug) {
                    for (let item of filtered) {
                        console.log(`Room: ${item[0]} connected: ${item[1].size}`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 30000, io);

        socketConnexionTimeout(io);
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject,
        autocomplete
    }
};