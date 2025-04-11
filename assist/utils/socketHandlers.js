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
const {logger} = require('./logger');
const deepMerge = require('@fastify/deepmerge')({all: true});

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
    let tabsCount = 0, agentsCount = 0, tabIDs = [], agentIDs = [], config = null, agentInfos = [];
    const connected_sockets = await io.in(roomID).fetchSockets();
    if (connected_sockets.length > 0) {
        for (let socket of connected_sockets) {
            if (socket.handshake.query.identity === IDENTITIES.session) {
                tabsCount++;
                tabIDs.push(socket.handshake.query.tabId);
            } else {
                agentsCount++;
                agentIDs.push(socket.id);
                agentInfos.push({ ...socket.handshake.query.agentInfo, socketId: socket.id });
                if (socket.handshake.query.config !== undefined) {
                    config = socket.handshake.query.config;
                }
            }
        }
    } else {
        tabsCount = -1;
        agentsCount = -1;
        agentInfos = [];
        agentIDs = [];
    }
    return {tabsCount, agentsCount, tabIDs, agentIDs, config, agentInfos};
}

function processNewSocket(socket) {
    socket._connectedAt = new Date();
    let {projectKey: connProjectKey, sessionId: connSessionId, tabId: connTabId} = extractPeerId(socket.handshake.query.peerId);
    socket.handshake.query.roomId = `${connProjectKey}-${connSessionId}`;
    socket.handshake.query.projectKey = connProjectKey;
    socket.handshake.query.sessId = connSessionId;
    socket.handshake.query.tabId = connTabId;
    logger.debug(`connProjectKey:${connProjectKey}, connSessionId:${connSessionId}, connTabId:${connTabId}, roomId:${socket.handshake.query.roomId}`);
}

async function onConnect(socket) {
    logger.debug(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
    processNewSocket(socket);
    IncreaseTotalWSConnections(socket.handshake.query.identity);
    IncreaseOnlineConnections(socket.handshake.query.identity);

    const io = getServer();
    const {tabsCount, agentsCount, tabIDs, agentInfos, agentIDs, config} = await getRoomData(io, socket.handshake.query.roomId);

    if (socket.handshake.query.identity === IDENTITIES.session) {
        // Check if session with the same tabID already connected, if so, refuse new connexion
        if (tabsCount > 0) {
            for (let tab of tabIDs) {
                if (tab === socket.handshake.query.tabId) {
                    logger.debug(`session already connected, refusing new connexion, peerId: ${socket.handshake.query.peerId}`);
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
            logger.debug(`notifying new session about agent-existence`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.WEBRTC_CONFIG, config);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agentIDs);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.AGENTS_INFO_CONNECTED, agentInfos);
            socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
        }
    } else if (tabsCount <= 0) {
        logger.debug(`notifying new agent about no SESSIONS with peerId:${socket.handshake.query.peerId}`);
        io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    await socket.join(socket.handshake.query.roomId);

    logger.debug(`${socket.id} joined room:${socket.handshake.query.roomId}, as:${socket.handshake.query.identity}, connections:${agentsCount + tabsCount + 1}`)

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        if (socket.handshake.query.agentInfo !== undefined) {
            socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
            socket.handshake.query.agentID = socket.handshake.query.agentInfo.id;
            // Stats
            startAssist(socket, socket.handshake.query.agentID);
        }
        io.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.WEBRTC_CONFIG, socket.handshake.query.config);
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, { ...socket.handshake.query.agentInfo });
    }

    // Set disconnect handler
    socket.on('disconnect', () => onDisconnect(socket));

    // Handle update event
    socket.on(EVENTS_DEFINITION.listen.UPDATE_EVENT, (...args) => onUpdateEvent(socket, ...args));

    // Handle webrtc events
    socket.on(EVENTS_DEFINITION.listen.WEBRTC_AGENT_CALL, (...args) => onWebrtcAgentHandler(socket, ...args));

    // Handle errors
    socket.on(EVENTS_DEFINITION.listen.ERROR, err => errorHandler(EVENTS_DEFINITION.listen.ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_ERROR, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_ERROR, err));
    socket.on(EVENTS_DEFINITION.listen.CONNECT_FAILED, err => errorHandler(EVENTS_DEFINITION.listen.CONNECT_FAILED, err));

    // Handle all other events
    socket.onAny((eventName, ...args) => onAny(socket, eventName, ...args));
}

async function onDisconnect(socket) {
    DecreaseOnlineConnections(socket.handshake.query.identity);
    logger.debug(`${socket.id} disconnected from ${socket.handshake.query.roomId}`);

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
        // Stats
        endAssist(socket, socket.handshake.query.agentID);
    }
    logger.debug("checking for number of connected agents and sessions");
    const io = getServer();
    let {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(io, socket.handshake.query.roomId);

    if (tabsCount === -1 && agentsCount === -1) {
        DecreaseOnlineRooms();
        logger.debug(`room not found: ${socket.handshake.query.roomId}`);
        return;
    }
    if (tabsCount === 0) {
        logger.debug(`notifying everyone in ${socket.handshake.query.roomId} about no SESSIONS`);
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    if (agentsCount === 0) {
        logger.debug(`notifying everyone in ${socket.handshake.query.roomId} about no AGENTS`);
        socket.to(socket.handshake.query.roomId).emit(EVENTS_DEFINITION.emit.NO_AGENTS);
    }
}

async function onUpdateEvent(socket, ...args) {
    logger.debug(`${socket.id} sent update event.`);
    if (socket.handshake.query.identity !== IDENTITIES.session) {
        logger.debug('Ignoring update event.');
        return
    }

    args[0] = updateSessionData(socket, args[0])
    socket.handshake.query.sessionInfo = deepMerge(socket.handshake.query.sessionInfo, args[0]?.data, {tabId: args[0]?.meta?.tabId});

    // Update sessionInfo for all agents in the room
    const io = getServer();
    const connected_sockets = await io.in(socket.handshake.query.roomId).fetchSockets();
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
            item.handshake.query.sessionInfo = deepMerge(item.handshake.query.sessionInfo, args[0]?.data, {tabId: args[0]?.meta?.tabId});
        } else if (item.handshake.query.identity === IDENTITIES.agent) {
            socket.to(item.id).emit(EVENTS_DEFINITION.listen.UPDATE_EVENT, args[0]);
        }
    }
}

async function onWebrtcAgentHandler(socket, ...args) {
    if (socket.handshake.query.identity === IDENTITIES.agent) {
        const agentIdToConnect = args[0]?.data?.toAgentId;
        logger.debug(`${socket.id} sent webrtc event to agent:${agentIdToConnect}`);
        if (agentIdToConnect && socket.handshake.sessionData.AGENTS_CONNECTED.includes(agentIdToConnect)) {
            socket.to(agentIdToConnect).emit(EVENTS_DEFINITION.listen.WEBRTC_AGENT_CALL, args[0]);
        }
    }
}

async function onAny(socket, eventName, ...args) {
    if (Object.values(EVENTS_DEFINITION.listen).indexOf(eventName) >= 0) {
        logger.debug(`received event:${eventName}, should be handled by another listener, stopping onAny.`);
        return
    }
    args[0] = updateSessionData(socket, args[0])
    if (socket.handshake.query.identity === IDENTITIES.session) {
        logger.debug(`received event:${eventName}, from:${socket.handshake.query.identity}, sending message to room:${socket.handshake.query.roomId}`);
        socket.to(socket.handshake.query.roomId).emit(eventName, args[0]);
    } else {
        // Stats
        handleEvent(eventName, socket, args[0]);
        logger.debug(`received event:${eventName}, from:${socket.handshake.query.identity}, sending message to session of room:${socket.handshake.query.roomId}`);
        const io = getServer();
        let socketId = await findSessionSocketId(io, socket.handshake.query.roomId, args[0]?.meta?.tabId);
        if (socketId === null) {
            logger.debug(`session not found for:${socket.handshake.query.roomId}`);
            io.to(socket.id).emit(EVENTS_DEFINITION.emit.NO_SESSIONS);
        } else {
            logger.debug("message sent");
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