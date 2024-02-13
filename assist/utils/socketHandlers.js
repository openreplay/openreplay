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

const debug_log = process.env.debug === "1";
const error_log = process.env.ERROR === "1";

const findSessionSocketId = async (io, roomId, tabId) => {
    let pickFirstSession = tabId === undefined;
    const connected_sockets = await io.in(roomId).fetchSockets();
    for (let socket of connected_sockets) {
        if (socket.handshake.query.identity === IDENTITIES.session) {
            if (pickFirstSession) {
                return socket.id;
            } else if (socket.handshake.query.tabId === tabId) {
                return socket.id;
            }
        }
    }
    return null;
};

async function getRoomData(io, roomID) {
    let tabsCount = 0, agentsCount = 0, tabIDs = [], agentIDs = [];
    const connected_sockets = await io.in(roomID).fetchSockets();
    if (connected_sockets.length > 0) {
        for (let socket of connected_sockets) {
            if (socket.handshake.query.identity === IDENTITIES.session) {
                tabsCount++;
                tabIDs.push(socket.handshake.query.tabId);
            } else {
                agentsCount++;
                agentIDs.push(socket.id);
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
    let {projectKey: connProjectKey, sessionId: connSessionId, tabId: connTabId} = extractPeerId(socket.handshake.query.peerId);
    socket.handshake.query.roomId = `${connProjectKey}-${connSessionId}`;
    socket.handshake.query.projectKey = connProjectKey;
    socket.handshake.query.sessId = connSessionId;
    socket.handshake.query.tabId = connTabId;
    debug_log && console.log(`connProjectKey:${connProjectKey}, connSessionId:${connSessionId}, connTabId:${connTabId}, roomId:${socket.handshake.query.roomId}`);
}

async function onConnect(socket) {
    debug_log && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
    processNewSocket(socket);
    IncreaseTotalWSConnections(socket.handshake.query.identity);
    IncreaseOnlineConnections(socket.handshake.query.identity);

    const io = getServer();
    const {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(io, socket.handshake.query.roomId);

    if (socket.handshake.query.identity === IDENTITIES.session) {
        // Check if session with the same tabID already connected, if so, refuse new connexion
        if (tabsCount > 0) {
            for (let tab of tabIDs) {
                if (tab === socket.handshake.query.tabId) {
                    error_log && console.log(`session already connected, refusing new connexion, peerId: ${socket.handshake.query.peerId}`);
                    io.to(socket.id).emit(EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
            }
        }
        extractSessionInfo(socket);
        if (tabsCount < 0) {
            // New session creates new room
            IncreaseTotalRooms();
            IncreaseOnlineRooms();
        }
        // Inform all connected agents about reconnected session
        if (agentsCount > 0) {
            debug_log && console.log(`notifying new session about agent-existence`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agentIDs);
            socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
        }
    } else if (tabsCount <= 0) {
        debug_log && console.log(`notifying new agent about no SESSIONS with peerId:${socket.handshake.query.peerId}`);
        io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    await socket.join(socket.handshake.query.roomId);

    if (debug_log) {
        let connectedSockets = await io.in(socket.handshake.query.roomId).fetchSockets();
        if (connectedSockets.length > 0) {
            console.log(`${socket.id} joined room:${socket.handshake.query.roomId}, as:${socket.handshake.query.identity}, members:${connectedSockets.length}`);
        }
    }

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        if (socket.handshake.query.agentInfo !== undefined) {
            socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
            socket.handshake.query.agentID = socket.handshake.query.agentInfo.id;
            // Stats
            startAssist(socket, socket.handshake.query.agentID);
        }
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
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
    DecreaseOnlineConnections(socket.handshake.query.identity);
    debug_log && console.log(`${socket.id} disconnected from ${socket.handshake.query.roomId}`);

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
        // Stats
        endAssist(socket, socket.handshake.query.agentID);
    }
    debug_log && console.log("checking for number of connected agents and sessions");
    const io = getServer();
    let {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(io, socket.handshake.query.roomId);

    if (tabsCount === -1 && agentsCount === -1) {
        DecreaseOnlineRooms();
        debug_log && console.log(`room not found: ${socket.handshake.query.roomId}`);
        return;
    }
    if (tabsCount === 0) {
        debug_log && console.log(`notifying everyone in ${socket.handshake.query.roomId} about no SESSIONS`);
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    if (agentsCount === 0) {
        debug_log && console.log(`notifying everyone in ${socket.handshake.query.roomId} about no AGENTS`);
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
    }
}

async function onUpdateEvent(socket, ...args) {
    debug_log && console.log(`${socket.id} sent update event.`);
    if (socket.handshake.query.identity !== IDENTITIES.session) {
        debug_log && console.log('Ignoring update event.');
        return
    }

    args[0] = updateSessionData(socket, args[0])
    Object.assign(socket.handshake.query.sessionInfo, args[0].data, {tabId: args[0]?.meta?.tabId});

    // Update sessionInfo for all agents in the room
    const io = getServer();
    const connected_sockets = await io.in(socket.handshake.query.roomId).fetchSockets();
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
    if (socket.handshake.query.identity === IDENTITIES.session) {
        debug_log && console.log(`received event:${eventName}, from:${socket.handshake.query.identity}, sending message to room:${socket.handshake.query.roomId}`);
        socket.to(socket.handshake.query.roomId).emit(eventName, args[0]);
    } else {
        // Stats
        handleEvent(eventName, socket, args[0]);
        debug_log && console.log(`received event:${eventName}, from:${socket.handshake.query.identity}, sending message to session of room:${socket.handshake.query.roomId}`);
        const io = getServer();
        let socketId = await findSessionSocketId(io, socket.handshake.query.roomId, args[0]?.meta?.tabId);
        if (socketId === null) {
            debug_log && console.log(`session not found for:${socket.handshake.query.roomId}`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
        } else {
            debug_log && console.log("message sent");
            io.to(socketId).emit(eventName, socket.id, args[0]);
        }
    }
}

// Back compatibility (add top layer with meta information)
function updateSessionData(socket, sessionData) {
    if (sessionData?.meta === undefined && socket.handshake.query.identity === IDENTITIES.session) {
        sessionData = {meta: {tabId: socket.handshake.query.tabId, version: 1}, data: sessionData};
    }
    return sessionData
}

module.exports = {
    onConnect,
}