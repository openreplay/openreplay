const _io = require('socket.io');
const express = require('express');
const uaParser = require('ua-parser-js');
const geoip2Reader = require('@maxmind/geoip2-node').Reader;
const {extractPeerId} = require('./peerjs-server');
const wsRouter = express.Router();
const UPDATE_EVENT = "UPDATE_SESSION";
const IDENTITIES = {agent: 'agent', session: 'session'};
const NEW_AGENT = "NEW_AGENT";
const NO_AGENTS = "NO_AGENT";
const AGENT_DISCONNECT = "AGENT_DISCONNECTED";
const AGENTS_CONNECTED = "AGENTS_CONNECTED";
const NO_SESSIONS = "SESSION_DISCONNECTED";
const SESSION_ALREADY_CONNECTED = "SESSION_ALREADY_CONNECTED";

let io;
const debug = process.env.debug === "1" || false;

const createSocketIOServer = function (server, prefix) {
    io = _io(server, {
        maxHttpBufferSize: (parseInt(process.env.maxHttpBufferSize) || 5) * 1e6,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT"]
        },
        path: (prefix ? prefix : '') + '/socket'
    });
}

const extractUserIdFromRequest = function (req) {
    if (req.query.userId) {
        debug && console.log(`[WS]where userId=${req.query.userId}`);
        return req.query.userId;
    }
    return undefined;
}

const extractProjectKeyFromRequest = function (req) {
    if (req.params.projectKey) {
        debug && console.log(`[WS]where projectKey=${req.params.projectKey}`);
        return req.params.projectKey;
    }
    return undefined;
}


const getAvailableRooms = async function () {
    return io.sockets.adapter.rooms.keys();
}

const respond = function (res, data) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": data}));
}

const socketsList = async function (req, res) {
    debug && console.log("[WS]looking for all available sessions");
    let userId = extractUserIdFromRequest(req);

    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            if (userId) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo && item.handshake.query.sessionInfo.userID === userId) {
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
wsRouter.get(`/${process.env.S3_KEY}/sockets-list`, socketsList);

const socketsListByProject = async function (req, res) {
    debug && console.log("[WS]looking for available sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let userId = extractUserIdFromRequest(req);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            if (userId) {
                const connected_sockets = await io.in(peerId).fetchSockets();
                for (let item of connected_sockets) {
                    if (item.handshake.query.identity === IDENTITIES.session && item.handshake.query.sessionInfo && item.handshake.query.sessionInfo.userID === userId) {
                        liveSessions[projectKey].push(sessionId);
                    }
                }
            } else {
                liveSessions[projectKey].push(sessionId);
            }
        }
    }
    respond(res, liveSessions[_projectKey] || []);
}
wsRouter.get(`/${process.env.S3_KEY}/sockets-list/:projectKey`, socketsListByProject);

const socketsLive = async function (req, res) {
    debug && console.log("[WS]looking for all available LIVE sessions");
    let userId = extractUserIdFromRequest(req);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    if (userId) {
                        if (item.handshake.query.sessionInfo && item.handshake.query.sessionInfo.userID === userId) {
                            liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                        }
                    } else {
                        liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                    }
                }
            }
        }
    }
    respond(res, liveSessions);
}
wsRouter.get(`/${process.env.S3_KEY}/sockets-live`, socketsLive);

const socketsLiveByProject = async function (req, res) {
    debug && console.log("[WS]looking for available LIVE sessions");
    let _projectKey = extractProjectKeyFromRequest(req);
    let userId = extractUserIdFromRequest(req);
    let liveSessions = {};
    let rooms = await getAvailableRooms();
    for (let peerId of rooms) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === _projectKey) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    if (userId) {
                        if (item.handshake.query.sessionInfo && item.handshake.query.sessionInfo.userID === userId) {
                            liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                        }
                    } else {
                        liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                    }
                }
            }
        }
    }
    respond(res, liveSessions[_projectKey] || []);
}
wsRouter.get(`/${process.env.S3_KEY}/sockets-live/:projectKey`, socketsLiveByProject);

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

function extractSessionInfo(socket) {
    if (socket.handshake.query.sessionInfo !== undefined) {
        debug && console.log("received headers");
        debug && console.log(socket.handshake.headers);
        socket.handshake.query.sessionInfo = JSON.parse(socket.handshake.query.sessionInfo);

        let ua = uaParser(socket.handshake.headers['user-agent']);
        socket.handshake.query.sessionInfo.userOs = ua.os.name || null;
        socket.handshake.query.sessionInfo.userBrowser = ua.browser.name || null;
        socket.handshake.query.sessionInfo.userBrowserVersion = ua.browser.version || null;
        socket.handshake.query.sessionInfo.userDevice = ua.device.model || null;
        socket.handshake.query.sessionInfo.userDeviceType = ua.device.type || 'desktop';
        socket.handshake.query.sessionInfo.userCountry = null;

        const options = {
            // you can use options like `cache` or `watchForUpdates`
        };
        // console.log("Looking for MMDB file in " + process.env.MAXMINDDB_FILE);
        geoip2Reader.open(process.env.MAXMINDDB_FILE, options)
            .then(reader => {
                debug && console.log("looking for location of ");
                debug && console.log(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address);
                let country = reader.country(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address);
                socket.handshake.query.sessionInfo.userCountry = country.country.isoCode;
            })
            .catch(error => {
                console.error(error);
            });
    }
}

module.exports = {
    wsRouter,
    start: (server, prefix) => {
        createSocketIOServer(server, prefix);
        io.on('connection', async (socket) => {
            debug && console.log(`WS started:${socket.id}, Query:${JSON.stringify(socket.handshake.query)}`);
            socket.peerId = socket.handshake.query.peerId;
            socket.identity = socket.handshake.query.identity;
            const {projectKey, sessionId} = extractPeerId(socket.peerId);
            socket.sessionId = sessionId;
            socket.projectKey = projectKey;
            socket.lastMessageReceivedAt = Date.now();
            let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
            if (socket.identity === IDENTITIES.session) {
                if (c_sessions > 0) {
                    debug && console.log(`session already connected, refusing new connexion`);
                    io.to(socket.id).emit(SESSION_ALREADY_CONNECTED);
                    return socket.disconnect();
                }
                extractSessionInfo(socket);
                if (c_agents > 0) {
                    debug && console.log(`notifying new session about agent-existence`);
                    let agents_ids = await get_all_agents_ids(io, socket);
                    io.to(socket.id).emit(AGENTS_CONNECTED, agents_ids);
                }

            } else if (c_sessions <= 0) {
                debug && console.log(`notifying new agent about no SESSIONS`);
                io.to(socket.id).emit(NO_SESSIONS);
            }
            socket.join(socket.peerId);
            if (io.sockets.adapter.rooms.get(socket.peerId)) {
                debug && console.log(`${socket.id} joined room:${socket.peerId}, as:${socket.identity}, members:${io.sockets.adapter.rooms.get(socket.peerId).size}`);
            }
            if (socket.identity === IDENTITIES.agent) {
                if (socket.handshake.query.agentInfo !== undefined) {
                    socket.handshake.query.agentInfo = JSON.parse(socket.handshake.query.agentInfo);
                }
                socket.to(socket.peerId).emit(NEW_AGENT, socket.id, socket.handshake.query.agentInfo);
            }

            socket.on('disconnect', async () => {
                debug && console.log(`${socket.id} disconnected from ${socket.peerId}`);
                if (socket.identity === IDENTITIES.agent) {
                    socket.to(socket.peerId).emit(AGENT_DISCONNECT, socket.id);
                }
                debug && console.log("checking for number of connected agents and sessions");
                let {c_sessions, c_agents} = await sessions_agents_count(io, socket);
                if (c_sessions === -1 && c_agents === -1) {
                    debug && console.log(`room not found: ${socket.peerId}`);
                }
                if (c_sessions === 0) {
                    debug && console.log(`notifying everyone in ${socket.peerId} about no SESSIONS`);
                    socket.to(socket.peerId).emit(NO_SESSIONS);
                }
                if (c_agents === 0) {
                    debug && console.log(`notifying everyone in ${socket.peerId} about no AGENTS`);
                    socket.to(socket.peerId).emit(NO_AGENTS);
                }
            });

            socket.on(UPDATE_EVENT, async (...args) => {
                debug && console.log(`${socket.id} sent update event.`);
                if (socket.identity !== IDENTITIES.session) {
                    debug && console.log('Ignoring update event.');
                    return
                }
                socket.handshake.query.sessionInfo = {...socket.handshake.query.sessionInfo, ...args[0]};
                socket.to(socket.peerId).emit(UPDATE_EVENT, args[0]);
            });

            socket.onAny(async (eventName, ...args) => {
                socket.lastMessageReceivedAt = Date.now();
                if (socket.identity === IDENTITIES.session) {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.peerId}`);
                    socket.to(socket.peerId).emit(eventName, args[0]);
                } else {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.peerId}`);
                    let socketId = await findSessionSocketId(io, socket.peerId);
                    if (socketId === null) {
                        debug && console.log(`session not found for:${socket.peerId}`);
                        io.to(socket.id).emit(NO_SESSIONS);
                    } else {
                        debug && console.log("message sent");
                        io.to(socketId).emit(eventName, socket.id, args[0]);
                    }
                }
            });

        });
        console.log("WS server started")
        setInterval(async (io) => {
            try {
                let count = 0;
                console.log(` ====== Rooms: ${io.sockets.adapter.rooms.size} ====== `);
                const arr = Array.from(io.sockets.adapter.rooms)
                const filtered = arr.filter(room => !room[1].has(room[0]))
                for (let i of filtered) {
                    let {projectKey, sessionId} = extractPeerId(i[0]);
                    if (projectKey !== null && sessionId !== null) {
                        count++;
                    }
                }
                console.log(` ====== Valid Rooms: ${count} ====== `);
                if (debug) {
                    for (let item of filtered) {
                        console.log(`Room: ${item[0]} connected: ${item[1].size}`)
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 20000, io);
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject
    }
};