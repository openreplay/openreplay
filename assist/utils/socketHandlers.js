const {
    extractPeerId,
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
const {
    IncreaseTotalWSConnections,
    IncreaseOnlineConnections,
    DecreaseOnlineConnections,
    IncreaseTotalRooms,
    IncreaseOnlineRooms,
    DecreaseOnlineRooms,
} = require('../utils/metrics');
const {
    AddRoom,
    UpdateRoom,
    DeleteRoom,
    DeleteSession,
} = require('../utils/rooms');

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

async function getRoomData(io, roomID) {
    let tabsCount = 0, agentsCount = 0, tabIDs = [], agentIDs = [];
    const connected_sockets = await io.in(roomID).fetchSockets();
    if (connected_sockets.length > 0) {
        for (let sock of connected_sockets) {
            if (sock.handshake.query.identity === IDENTITIES.session) {
                tabsCount++;
                tabIDs.push(sock.tabId);
            } else {
                agentsCount++;
                agentIDs.push(sock.id);
            }
        }
    } else {
        tabsCount = -1;
        agentsCount = -1;
    }
    return {tabsCount, agentsCount, tabIDs, agentIDs};
}

function processNewSocket(socket) {
    socket._connectedAt = new Date();
    socket.identity = socket.handshake.query.identity;
    socket.peerId = socket.handshake.query.peerId;
    let {projectKey: connProjectKey, sessionId: connSessionId, tabId: connTabId} = extractPeerId(socket.peerId);
    socket.roomId = `${connProjectKey}-${connSessionId}`;
    socket.projectId = socket.handshake.query.projectId;
    socket.projectKey = connProjectKey;
    socket.sessId = connSessionId;
    socket.tabId = connTabId;
    debug_log && console.log(`connProjectKey:${connProjectKey}, connSessionId:${connSessionId}, connTabId:${connTabId}, roomId:${socket.roomId}`);
}

async function onConnect(socket) {
    debug_log && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
    processNewSocket(socket);
    IncreaseTotalWSConnections(socket.identity);
    IncreaseOnlineConnections(socket.identity);

    const io = getServer();
    const {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(io, socket.roomId);

    if (socket.identity === IDENTITIES.session) {
        // Check if session with the same tabID already connected, if so, refuse new connexion
        if (tabsCount > 0) {
            for (let tab of tabIDs) {
                if (tab === socket.tabId) {
                    error_log && console.log(`session already connected, refusing new connexion, peerId: ${socket.peerId}`);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
            }
        }
        if (tabsCount < 0) {
            // New session creates new room
            IncreaseTotalRooms();
            IncreaseOnlineRooms();
            AddRoom(socket.projectKey, socket.sessId, socket.handshake.query.sessionInfo);
        }
        extractSessionInfo(socket);
        // Inform all connected agents about reconnected session
        if (agentsCount > 0) {
            debug_log && console.log(`notifying new session about agent-existence`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agentIDs);
            socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
        }
    } else if (tabsCount <= 0) {
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

    // Handle errors
    socket.on(EVENTS_DEFINITION.listen.ERROR, err => errorHandler(EVENTS_DEFINITION.listen.ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_ERROR, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_FAILED, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_FAILED, err));

    // Handle all other events
    socket.onAny((eventName, ...args) => onAny(socket, eventName, ...args));
}

async function onDisconnect(socket) {
    DecreaseOnlineConnections(socket.identity);
    debug_log && console.log(`${socket.id} disconnected from ${socket.roomId}`);

    if (socket.identity === IDENTITIES.agent) {
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
        // Stats
        endAssist(socket, socket.agentID);
    }
    debug_log && console.log("checking for number of connected agents and sessions");
    const io = getServer();
    let {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(io, socket.roomId);

    if (tabsCount === -1 && agentsCount === -1) {
        DecreaseOnlineRooms();
        debug_log && console.log(`room not found: ${socket.roomId}`);
        DeleteSession(socket.projectKey, socket.sessId);
        DeleteRoom(socket.projectKey, socket.sessId);
        return;
    }
    if (tabsCount === 0) {
        debug_log && console.log(`notifying everyone in ${socket.roomId} about no SESSIONS`);
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
        DeleteSession(socket.projectKey, socket.sessId);
    }
    if (agentsCount === 0) {
        debug_log && console.log(`notifying everyone in ${socket.roomId} about no AGENTS`);
        socket.to(socket.roomId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
    }
}

async function onUpdateEvent(socket, ...args) {
    debug_log && console.log(`${socket.id} sent update event.`);
    if (socket.identity !== IDENTITIES.session) {
        debug_log && console.log('Ignoring update event.');
        return
    }

    args[0] = updateSessionData(socket, args[0])
    Object.assign(socket.handshake.query.sessionInfo, args[0].data, {tabId: args[0]?.meta?.tabId});
    UpdateRoom(socket.sessId, socket.handshake.query.sessionInfo);

    // Update sessionInfo for all agents in the room
    const io = getServer();
    const connected_sockets = await io.in(socket.roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
            Object.assign(item.handshake.query.sessionInfo, args[0]?.data, {tabId: args[0]?.meta?.tabId});
        } else if (item.handshake.query.identity === IDENTITIES.agent) {
            socket.to(item.id).emit(EVENTS_DEFINITION.listen.UPDATE_EVENT, args[0]);
        }
    }
}

async function onAny(socket, eventName, ...args) {
    if (Object.values(EVENTS_DEFINITION.listen).indexOf(eventName) >= 0) {
        debug_log && console.log(`received event:${eventName}, should be handled by another listener, stopping onAny.`);
        return
    }
    args[0] = updateSessionData(socket, args[0])
    if (socket.identity === IDENTITIES.session) {
        debug_log && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.roomId}`);
        socket.to(socket.roomId).emit(eventName, args[0]);
    } else {
        // Stats
        handleEvent(eventName, socket, args[0]);
        debug_log && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.roomId}`);
        const io = getServer();
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

// Back compatibility (add top layer with meta information)
function updateSessionData(socket, sessionData) {
    if (sessionData?.meta === undefined && socket.identity === IDENTITIES.session) {
        sessionData = {meta: {tabId: socket.tabId, version: 1}, data: sessionData};
    }
    return sessionData
}

module.exports = {
    onConnect,
}