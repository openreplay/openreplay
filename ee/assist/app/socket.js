const {
    processPeerInfo,
    IDENTITIES,
    EVENTS_DEFINITION,
    extractSessionInfo,
    errorHandler
} = require("./assist");
const {
    addSession,
    updateSession,
    renewSession,
    removeSession
} = require('./cache');
const {
    logger
} = require('./logger');
const {
    startAssist,
    endAssist,
    handleEvent
} = require('./stats');
const deepMerge = require('@fastify/deepmerge')({all: true});

let io;

const setSocketIOServer = function (server) {
    io = server;
}

function sendFrom(from, to, eventName, ...data) {
    from.to(to).emit(eventName, ...data);
}

function sendTo(to, eventName, ...data) {
    sendFrom(io, to, eventName, ...data);
}

const fetchSockets = async function (roomID) {
    if (!io) {
        return [];
    }
    try {
        if (roomID) {
            return await io.in(roomID).fetchSockets();
        } else {
            return await io.fetchSockets();
        }
    } catch (error) {
        logger.error('Error fetching sockets:', error);
        return [];
    }
}

const findSessionSocketId = async (roomId, tabId) => {
    let pickFirstSession = tabId === undefined;
    const connected_sockets = await fetchSockets(roomId);
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

async function getRoomData(roomID) {
    let tabsCount = 0, agentsCount = 0, tabIDs = [], agentIDs = [];
    const connected_sockets = await fetchSockets(roomID);
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

async function onConnect(socket) {
    logger.debug(`A new client:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
    // Drop unknown socket.io connections
    if (socket.handshake.query.identity === undefined || socket.handshake.query.peerId === undefined) {
        logger.debug(`no identity or peerId, refusing connexion`);
        return socket.disconnect();
    } else if (socket.handshake.query.identity === IDENTITIES.session && socket.handshake.query.sessionInfo === undefined) {
        logger.debug(`sessionInfo is undefined, refusing connexion`);
        return socket.disconnect();
    }
    processPeerInfo(socket);

    const {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(socket.handshake.query.roomId);

    if (socket.handshake.query.identity === IDENTITIES.session) {
        // Check if session with the same tabID already connected, if so, refuse new connexion
        if (tabsCount > 0) {
            for (let tab of tabIDs) {
                if (tab === socket.handshake.query.tabId) {
                    logger.debug(`session already connected, refusing new connexion, peerId: ${socket.handshake.query.peerId}`);
                    sendTo(socket.id, EVENTS_DEFINITION.emit.SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
            }
        }
        extractSessionInfo(socket);
        if (tabsCount < 0) {
            // New session creates new room
        }
        // Inform all connected agents about reconnected session
        if (agentsCount > 0) {
            logger.debug(`notifying new session about agent-existence`);
            sendTo(socket.id, EVENTS_DEFINITION.emit.AGENTS_CONNECTED, agentIDs);
            sendFrom(socket, socket.handshake.query.roomId, EVENTS_DEFINITION.emit.SESSION_RECONNECTED, socket.id);
        }
    } else if (tabsCount <= 0) {
        logger.debug(`notifying new agent about no SESSIONS with peerId:${socket.handshake.query.peerId}`);
        sendTo(socket.id, EVENTS_DEFINITION.emit.NO_SESSIONS);
    }

    await socket.join(socket.handshake.query.roomId);
    logger.debug(`${socket.id} joined room:${socket.handshake.query.roomId}, as:${socket.handshake.query.identity}, connections:${agentsCount + tabsCount + 1}`)

    // Add session to cache
    if (socket.handshake.query.identity === IDENTITIES.session) {
        await addSession(socket.handshake.query.sessId, socket.handshake.query.sessionInfo);
    }

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        if (socket.handshake.query.agentInfo !== undefined) {
            socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
            socket.handshake.query.agentID = socket.handshake.query.agentInfo.id;
            startAssist(socket, socket.handshake.query.agentID);
        }
        sendFrom(socket, socket.handshake.query.roomId, EVENTS_DEFINITION.emit.NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
    }

    socket.conn.on("packet", (packet) => {
        if (packet.type === 'pong') {
            renewSession(socket.handshake.query.sessId);
        }
    });

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

    // Handle all other events (usually dom's mutations and user's actions)
    socket.onAny((eventName, ...args) => onAny(socket, eventName, ...args));
}

async function onDisconnect(socket) {
    logger.debug(`${socket.id} disconnected from ${socket.handshake.query.roomId}`);

    if (socket.handshake.query.identity === IDENTITIES.agent) {
        endAssist(socket, socket.handshake.query.agentID);
        sendFrom(socket, socket.handshake.query.roomId, EVENTS_DEFINITION.emit.AGENT_DISCONNECT, socket.id);
    }
    logger.debug("checking for number of connected agents and sessions");
    let {tabsCount, agentsCount, tabIDs, agentIDs} = await getRoomData(socket.handshake.query.roomId);

    if (tabsCount <= 0) {
        await removeSession(socket.handshake.query.sessId);
    }

    if (tabsCount === -1 && agentsCount === -1) {
        logger.debug(`room not found: ${socket.handshake.query.roomId}`);
        return;
    }
    if (tabsCount === 0) {
        logger.debug(`notifying everyone in ${socket.handshake.query.roomId} about no SESSIONS`);
        sendFrom(socket, socket.handshake.query.roomId, EVENTS_DEFINITION.emit.NO_SESSIONS);
    }
    if (agentsCount === 0) {
        logger.debug(`notifying everyone in ${socket.handshake.query.roomId} about no AGENTS`);
        sendFrom(socket, socket.handshake.query.roomId, EVENTS_DEFINITION.emit.NO_AGENTS);
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

    // update session cache
    await updateSession(socket.handshake.query.sessId, socket.handshake.query.sessionInfo);

    // Update sessionInfo for all agents in the room
    const connected_sockets = await fetchSockets(socket.handshake.query.roomId);
    for (let item of connected_sockets) {
        if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo) {
            item.handshake.query.sessionInfo = deepMerge(item.handshake.query.sessionInfo, args[0]?.data, {tabId: args[0]?.meta?.tabId});
        } else if (item.handshake.query.identity === IDENTITIES.agent) {
            sendFrom(socket, item.id, EVENTS_DEFINITION.emit.UPDATE_EVENT, args[0]);
        }
    }
}

async function onWebrtcAgentHandler(socket, ...args) {
    if (socket.handshake.query.identity === IDENTITIES.agent) {
        const agentIdToConnect = args[0]?.data?.toAgentId;
        logger.debug(`${socket.id} sent webrtc event to agent:${agentIdToConnect}`);
        if (agentIdToConnect && socket.handshake.sessionData.AGENTS_CONNECTED.includes(agentIdToConnect)) {
            sendFrom(socket, agentIdToConnect, EVENTS_DEFINITION.listen.WEBRTC_AGENT_CALL, args[0]);
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
        sendFrom(socket, socket.handshake.query.roomId, eventName, args[0]);
    } else {
        handleEvent(eventName, socket, args[0]);
        logger.debug(`received event:${eventName}, from:${socket.handshake.query.identity}, sending message to session of room:${socket.handshake.query.roomId}`);
        let socketId = await findSessionSocketId(socket.handshake.query.roomId, args[0]?.meta?.tabId);
        if (socketId === null) {
            logger.debug(`session not found for:${socket.handshake.query.roomId}`);
            sendTo(socket.id, EVENTS_DEFINITION.emit.NO_SESSIONS);
        } else {
            logger.debug("message sent");
            sendTo(socket.id, eventName, socket.id, args[0]);
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
    setSocketIOServer,
}
