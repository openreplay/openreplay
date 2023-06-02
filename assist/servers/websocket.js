const _io = require('socket.io');
const express = require('express');
const {
    extractRoomId,
    extractTabId,
    extractPeerId,
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    hasFilters,
    isValidSession,
    extractPayloadFromRequest,
    sortPaginate,
    getValidAttributes,
    uniqueAutocomplete,
    getAvailableRooms,
    getCompressionConfig
} = require('../utils/helper');
const {
    IDENTITIES,
    EVENTS_DEFINITION,
    extractSessionInfo,
    socketConnexionTimeout,
    errorHandler,
    authorizer
} = require('../utils/assistHelper');
const wsRouter = express.Router();

let io;
const debug = true;//process.env.debug === "1";

const createSocketIOServer = function (server, prefix) {
    io = _io(server, {
        maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT"]
        },
        path: (prefix ? prefix : '') + '/socket',
        ...getCompressionConfig()
    });
}

const respond = function (res, data) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": data}));
}

const socketsList = async function (req, res) {
    debug && console.log("[WS]looking for all available sessions");
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey !== undefined) {
            liveSessionsPerProject[projectKey] = liveSessionsPerProject[projectKey] || new Set();
            if (withFilters) {
                const connected_sockets = await io.in(roomId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessionsPerProject[projectKey].add(sessionId);
                    }
                }
            } else {
                liveSessionsPerProject[projectKey].add(sessionId);
            }
        }
    }
    let liveSessions = {};
    liveSessionsPerProject.forEach((sessions, projectId) => {
        liveSessions[projectId] = Array.from(sessions);
    });
    respond(res, liveSessions);
}

const socketsListByProject = async function (req, res) {
    debug && console.log("[WS]looking for available sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            if (withFilters) {
                const connected_sockets = await io.in(roomId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo
                        && isValidSession(item.handshake.query.sessionInfo, filters.filter)) {
                        liveSessions.add(sessionId);
                    }
                }
            } else {
                liveSessions.add(sessionId);
            }
        }
    }
    let sessions = Array.from(liveSessions);
    respond(res, _sessionId === undefined ? sortPaginate(sessions, filters)
        : sessions.length > 0 ? sessions[0]
            : null);
}

const socketsLive = async function (req, res) {
    debug && console.log("[WS]looking for all available LIVE sessions");
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessionsPerProject = {};
    let rooms = await getAvailableRooms(io);
    for (let peerId of rooms.keys()) {
        let {projectKey} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
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
    respond(res, sortPaginate(liveSessions, filters));
}

const socketsLiveByProject = async function (req, res) {
    debug && console.log("[WS]looking for available LIVE sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let _sessionId = extractSessionIdFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let withFilters = hasFilters(filters);
    let liveSessions = new Set();
    const sessIDs = new Set();
    let rooms = await getAvailableRooms(io);
    for (let roomId of rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(roomId);
        if (projectKey === _projectKey && (_sessionId === undefined || _sessionId === sessionId)) {
            let connected_sockets = await io.in(roomId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    if (withFilters) {
                        if (item.handshake.query.sessionInfo &&
                            isValidSession(item.handshake.query.sessionInfo, filters.filter) &&
                            !sessIDs.has(item.handshake.query.sessionInfo.sessionId)
                        ) {
                            liveSessions.add(item.handshake.query.sessionInfo);
                            sessIDs.set(item.handshake.query.sessionInfo.sessionId);
                        }
                    } else {
                        if (!sessIDs.has(item.handshake.query.sessionInfo.sessionId)) {
                            liveSessions.add(item.handshake.query.sessionInfo);
                        }
                    }
                }
            }
        }
    }
    let sessions = Array.from(liveSessions);
    console.log("sessions: ", sessions);
    respond(res, _sessionId === undefined ? sortPaginate(sessions, filters) : sessions.length > 0 ? sessions[0] : null);
}

const autocomplete = async function (req, res) {
    debug && console.log("[WS]autocomplete");
    let _projectKey = extractProjectKeyFromRequest(req);
    let filters = await extractPayloadFromRequest(req);
    let results = [];
    if (filters.query && Object.keys(filters.query).length > 0) {
        let rooms = await getAvailableRooms(io);
        for (let peerId of rooms.keys()) {
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

const findSessionSocketId = async (io, roomId, tabId) => {
    const connected_sockets = await io.in(roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.tabId === tabId) {
            return item.id;
        }
    }
    return null;
};

async function sessions_agents_count(io, socket) {
    let c_sessions = 0, c_agents = 0;
    const rooms = await getAvailableRooms(io);
    if (rooms.get(socket.roomId)) {
        const connected_sockets = await io.in(socket.roomId).fetchSockets();

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
    const rooms = await getAvailableRooms(io);
    if (rooms.get(socket.roomId)) {
        const connected_sockets = await io.in(socket.roomId).fetchSockets();
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
        io.use(async (socket, next) => await authorizer.check(socket, next));
        io.on('connection', async (socket) => {
            socket.on(EVENTS_DEFINITION.listen.ERROR, err => errorHandler(EVENTS_DEFINITION.listen.ERROR, err));
            debug && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
            socket._connectedAt = new Date();

            socket.peerId = socket.handshake.query.peerId;
            let {projectKey: connProjectKey, sessionId: connSessionId, tabId:connTabId} = extractPeerId(socket.handshake.query.peerId);
            socket.roomId = extractRoomId(socket.peerId);
            debug && console.log(`connProjectKey:${connProjectKey}, connSessionId:${connSessionId}, connTabId:${connTabId}, roomId:${socket.roomId}`);
            socket.tabId = connTabId;
            socket.identity = socket.handshake.query.identity;
            let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
            if (socket.identity === IDENTITIES.session) {
                if (c_sessions > 0) {
                    const rooms = await getAvailableRooms(io);
                    for (let roomId of rooms.keys()) {
                        let {projectKey} = extractPeerId(roomId);
                        if (projectKey === connProjectKey) {
                            const connected_sockets = await io.in(roomId).fetchSockets();
                            for (let item of connected_sockets) {
                                if (item.tabId === connTabId) {
                                    debug && console.log(`session already connected, refusing new connexion`);
                                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                                    return socket.disconnect();
                                }
                            }
                        }
                    }
                }
                extractSessionInfo(socket);
                if (c_agents > 0) {
                    debug && console.log(`notifying new session about agent-existence`);
                    let agents_ids = await get_all_agents_ids(io, socket);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agents_ids);
                    socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
                }

            } else if (c_sessions <= 0) {
                debug && console.log(`notifying new agent about no SESSIONS with peerId:${socket.peerId}`);
                io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
            }
            await socket.join(socket.roomId);
            const rooms = await getAvailableRooms(io);
            if (rooms.get(socket.roomId)) {
                debug && console.log(`${socket.id} joined room:${socket.roomId}, as:${socket.identity}, members:${rooms.get(socket.roomId).size}`);
            }
            if (socket.identity === IDENTITIES.agent) {
                if (socket.handshake.query.agentInfo !== undefined) {
                    socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
                }
                socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
            }

            socket.on('disconnect', async () => {
                debug && console.log(`${socket.id} disconnected from ${socket.roomId}`);
                if (socket.identity === IDENTITIES.agent) {
                    socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
                }
                debug && console.log("checking for number of connected agents and sessions");
                let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
                if (c_sessions === -1 && c_agents === -1) {
                    debug && console.log(`room not found: ${socket.roomId}`);
                }
                if (c_sessions === 0) {
                    debug && console.log(`notifying everyone in ${socket.roomId} about no SESSIONS`);
                    socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
                }
                if (c_agents === 0) {
                    debug && console.log(`notifying everyone in ${socket.roomId} about no AGENTS`);
                    socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
                }
            });

            socket.on(EVENTS_DEFINITION.listen.UPDATE_EVENT, async (...args) => {
                debug && console.log(`${socket.id} sent update event.`);
                if (socket.identity !== IDENTITIES.session) {
                    debug && console.log('Ignoring update event.');
                    return
                }
                Object.assign(socket.handshake.query.sessionInfo, args[0].data, {tabId: args[0].meta.tabId});
                socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.UPDATE_EVENT, args[0]);
                // Update sessionInfo for all sessions (TODO: rewrite this)
                const rooms = await getAvailableRooms(io);
                for (let roomId of rooms.keys()) {
                    let {projectKey} = extractPeerId(roomId);
                    if (projectKey === connProjectKey) {
                        const connected_sockets = await io.in(roomId).fetchSockets();
                        for (let item of connected_sockets) {
                            if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
                                Object.assign(item.handshake.query.sessionInfo, args[0].data, {tabId: args[0].meta.tabId});
                            }
                        }
                    }
                }
            });

            socket.on(EVENTS_DEFINITION.listen.CONNECT_ERROR, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_ERROR, err));
            socket.on(EVENTS_DEFINITION.listen.CONNECT_FAILED, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_FAILED, err));

            socket.onAny(async (eventName, ...args) => {
                if (Object.values(EVENTS_DEFINITION.listen).indexOf(eventName) >= 0) {
                    debug && console.log(`received event:${eventName}, should be handled by another listener, stopping onAny.`);
                    return
                }
                if (socket.identity === IDENTITIES.session) {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.roomId}`);
                    // TODO: emit message to all agents in the room (except tabs)
                    socket.to(socket.roomId).emit(eventName, args[0]);
                } else {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.roomId}`);
                    // TODO: new message structure: {meta: {tabId: string::id}, data: xxx -> args[0]}
                    if (args[0].meta === undefined) {
                        debug && console.log(`received event:${eventName}, from:${socket.identity}, but message structure is wrong, stopping onAny.`);
                        return
                    }
                    let socketId = await findSessionSocketId(io, socket.roomId, args[0].meta.tabId);
                    if (socketId === null) {
                        debug && console.log(`session not found for:${socket.roomId}`);
                        io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
                    } else {
                        debug && console.log("message sent");
                        io.to(socketId).emit(eventName, socket.id, args[0].data);
                    }
                }
            });

        });
        console.log("WS server started");
        setInterval(async (io) => {
            try {
                let count = 0;
                const rooms = await getAvailableRooms(io);
                console.log(` ====== Rooms: ${rooms.size} ====== `);
                const arr = Array.from(rooms);
                const filtered = arr.filter(room => !room[1].has(room[0]));
                for (let i of filtered) {
                    let {projectKey, sessionId, tabId} = extractPeerId(i[0]);
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
        socketsLiveByProject
    }
};
