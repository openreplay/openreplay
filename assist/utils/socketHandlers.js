const {
    extractPeerId,
    extractRoomId,
} = require("./helper");
const {
    IDENTITIES,
    EVENTS_DEFINITION,
    extractSessionInfo,
    errorHandler
} = require("./assistHelper");
const {
    startAssist,
    endAssist,
    handleEvent
} = require("./stats");
const {
    getServer
} = require('../utils/wsServer');

const debug_log = process.env.debug === "1";
const error_log = process.env.ERROR === "1";

const findSessionSocketId = async (io, roomId, tabId) => {
    let pickFirstSession = tabId === undefined;
    const connected_sockets = await io.in(roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session) {
            if (pickFirstSession) {
                return item.id;
            } else if (item.tabId === tabId) {
                return item.id;
            }
        }
    }
    return null;
};

async function sessions_agents_count(io, socket) {
    let c_sessions = 0, c_agents = 0;
    const connected_sockets = await io.in(socket.roomId).fetchSockets();
    if (connected_sockets.length > 0) {
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
    const connected_sockets = await io.in(socket.roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.agent) {
            agents.push(item.id);
        }
    }
    return agents;
}

function processNewSocket(socket) {
    socket._connectedAt = new Date();
    socket.identity = socket.handshake.query.identity;
    socket.peerId = socket.handshake.query.peerId;
    let {projectKey: connProjectKey, sessionId: connSessionId, tabId: connTabId} = extractPeerId(socket.peerId);
    socket.roomId = extractRoomId(socket.peerId);
    socket.projectId = socket.handshake.query.projectId;
    socket.projectKey = connProjectKey;
    socket.sessId = connSessionId;
    socket.tabId = connTabId ?? (Math.random() + 1).toString(36).substring(2);
    debug_log && console.log(`connProjectKey:${connProjectKey}, connSessionId:${connSessionId}, connTabId:${connTabId}, roomId:${socket.roomId}`);
}

async function onConnect(socket) {
    debug_log && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
    processNewSocket(socket);

    const io = getServer();
    let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
    if (socket.identity === IDENTITIES.session) {
        // Check if session already connected, if so, refuse new connexion
        if (c_sessions > 0) {
            const connected_sockets = await io.in(roomId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.tabId === socket.tabId) {
                    error_log && console.log(`session already connected, refusing new connexion, peerId: ${socket.peerId}`);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
            }
        }
        extractSessionInfo(socket);
        // Inform all connected agents about reconnected session
        if (c_agents > 0) {
            debug_log && console.log(`notifying new session about agent-existence`);
            let agents_ids = await get_all_agents_ids(io, socket);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agents_ids);
            socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
        }

    } else if (c_sessions <= 0) {
        debug_log && console.log(`notifying new agent about no SESSIONS with peerId:${socket.peerId}`);
        io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    await socket.join(socket.roomId);

    if (debug_log) {
        let connectedSockets = await io.in(socket.roomId).fetchSockets();
        if (connectedSockets.length > 0) {
            console.log(`${socket.id} joined room:${socket.roomId}, as:${socket.identity}, members:${connectedSockets.length}`);
        }
    }

    if (socket.identity === IDENTITIES.agent) {
        if (socket.handshake.query.agentInfo !== undefined) {
            socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
            socket.agentID = socket.handshake.query.agentInfo.id;
            // Stats
            startAssist(socket, socket.agentID);
        }
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
    }

    // Set disconnect handler
    socket.on('disconnect', () => onDisconnect(socket));

    // Handle update event
    socket.on(EVENTS_DEFINITION.listen.UPDATE_EVENT, (...args) => onUpdateEvent(socket, ...args));

    // Handle server update event
    socket.on(EVENTS_DEFINITION.server.UPDATE_SESSION, (...args) => onUpdateServerEvent(socket, ...args));

    // Handle errors
    socket.on(EVENTS_DEFINITION.listen.ERROR, err => errorHandler(EVENTS_DEFINITION.listen.ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_ERROR, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_FAILED, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_FAILED, err));

    // Handle all other events
    socket.onAny((eventName, ...args) => onAny(socket, eventName, ...args));
}

async function onDisconnect(socket) {
    const io = getServer();
    debug_log && console.log(`${socket.id} disconnected from ${socket.roomId}`);
    if (socket.identity === IDENTITIES.agent) {
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
        // Stats
        endAssist(socket, socket.agentID);
    }
    debug_log && console.log("checking for number of connected agents and sessions");
    let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
    if (c_sessions === -1 && c_agents === -1) {
        debug_log && console.log(`room not found: ${socket.roomId}`);
    }
    if (c_sessions === 0) {
        debug_log && console.log(`notifying everyone in ${socket.roomId} about no SESSIONS`);
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    if (c_agents === 0) {
        debug_log && console.log(`notifying everyone in ${socket.roomId} about no AGENTS`);
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
    }
}

async function onUpdateEvent(socket, ...args) {
    const io = getServer();
    debug_log && console.log(`${socket.id} sent update event.`);
    if (socket.identity !== IDENTITIES.session) {
        debug_log && console.log('Ignoring update event.');
        return
    }

    // Back compatibility (add top layer with meta information)
    if (args[0]?.meta === undefined && socket.identity === IDENTITIES.session) {
        args[0] = {meta: {tabId: socket.tabId, version: 1}, data: args[0]};
    }
    Object.assign(socket.handshake.query.sessionInfo, args[0].data, {tabId: args[0]?.meta?.tabId});
    socket.to(socket.roomId).emit(EVENTS_DEFINITION.server.UPDATE_SESSION, args[0]);

    // Update sessionInfo for all sessions in room
    const connected_sockets = await io.in(socket.roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
            Object.assign(item.handshake.query.sessionInfo, args[0]?.data, {tabId: args[0]?.meta?.tabId});
        }
    }
}

async function onUpdateServerEvent(socket, ...args) {
    debug_log && console.log(`Server sent update event through ${socket.id}.`);
    if (socket.identity !== IDENTITIES.session) {
        debug_log && console.log('Ignoring server update event.');
        return
    }
    // Back compatibility (add top layer with meta information)
    if (args[0]?.meta === undefined && socket.identity === IDENTITIES.session) {
        args[0] = {meta: {tabId: socket.tabId, version: 1}, data: args[0]};
    }
    Object.assign(socket.handshake.query.sessionInfo, args[0].data, {tabId: args[0]?.meta?.tabId});
}

async function onAny(socket, eventName, ...args) {
    const io = getServer();
    if (Object.values(EVENTS_DEFINITION.listen).indexOf(eventName) >= 0) {
        debug_log && console.log(`received event:${eventName}, should be handled by another listener, stopping onAny.`);
        return
    }
    // Back compatibility (add top layer with meta information)
    if (args[0]?.meta === undefined && socket.identity === IDENTITIES.session) {
        args[0] = {meta: {tabId: socket.tabId, version: 1}, data: args[0]};
    }
    if (socket.identity === IDENTITIES.session) {
        debug_log && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.roomId}`);
        socket.to(socket.roomId).emit(eventName, args[0]);
    } else {
        // Stats
        handleEvent(eventName, socket, args[0]);
        debug_log && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.roomId}`);
        let socketId = await findSessionSocketId(io, socket.roomId, args[0]?.meta?.tabId);
        if (socketId === null) {
            debug_log && console.log(`session not found for:${socket.roomId}`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
        } else {
            debug_log && console.log("message sent");
            io.to(socketId).emit(eventName, socket.id, args[0]);
        }
    }
}

module.exports = {
    onConnect,
}