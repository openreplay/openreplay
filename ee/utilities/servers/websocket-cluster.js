const _io = require('socket.io');
const express = require('express');
const uaParser = require('ua-parser-js');
const geoip2Reader = require('@maxmind/geoip2-node').Reader;
const {extractPeerId} = require('./peerjs-server');
const {createAdapter} = require("@socket.io/redis-adapter");
const {createClient} = require("redis");
const wsRouter = express.Router();
const UPDATE_EVENT = "UPDATE_SESSION";
const IDENTITIES = {agent: 'agent', session: 'session'};
const NEW_AGENT = "NEW_AGENT";
const NO_AGENTS = "NO_AGENT";
const AGENT_DISCONNECT = "AGENT_DISCONNECTED";
const AGENTS_CONNECTED = "AGENTS_CONNECTED";
const NO_SESSIONS = "SESSION_DISCONNECTED";
const SESSION_ALREADY_CONNECTED = "SESSION_ALREADY_CONNECTED";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = createClient({url: REDIS_URL});
const subClient = pubClient.duplicate();

let io;
const debug = process.env.debug === "1" || false;

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

const uniqueSessions = function (data) {
    let resArr = [];
    let resArrIDS = [];
    for (let item of data) {
        if (resArrIDS.indexOf(item.sessionID) < 0) {
            resArr.push(item);
            resArrIDS.push(item.sessionID);
        }
    }
    return resArr;
}

const extractUserIdFromRequest = function (req) {
    if (process.env.uws === "true") {
        if (req.getQuery("userId")) {
            debug && console.log(`[WS]where userId=${req.getQuery("userId")}`);
            return req.getQuery("userId");
        }
    } else if (req.query.userId) {
        debug && console.log(`[WS]where userId=${req.query.userId}`);
        return req.query.userId;
    }
    return undefined;
}

const extractProjectKeyFromRequest = function (req) {
    if (process.env.uws === "true") {
        if (req.getParameter(0)) {
            debug && console.log(`[WS]where projectKey=${req.getParameter(0)}`);
            return req.getParameter(0);
        }
    } else if (req.params.projectKey) {
        debug && console.log(`[WS]where projectKey=${req.params.projectKey}`);
        return req.params.projectKey;
    }
    return undefined;
}


const getAvailableRooms = async function () {
    let rooms = await io.of('/').adapter.allRooms();
    return rooms;
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
            liveSessions[projectKey] = uniqueSessions(liveSessions[_projectKey]);
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
            liveSessions[projectKey] = uniqueSessions(liveSessions[_projectKey]);
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
    let rooms = await io.of('/').adapter.allRooms();
    if (rooms.has(socket.peerId)) {
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
    let rooms = await io.of('/').adapter.allRooms();
    if (rooms.has(socket.peerId)) {
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
            await io.of('/').adapter.remoteJoin(socket.id, socket.peerId);
            let rooms = await io.of('/').adapter.allRooms();
            if (rooms.has(socket.peerId)) {
                let connectedSockets = await io.in(socket.peerId).fetchSockets();
                debug && console.log(`${socket.id} joined room:${socket.peerId}, as:${socket.identity}, members:${connectedSockets.length}`);
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
                let rooms = await io.of('/').adapter.allRooms();
                let validRooms = [];
                console.log(` ====== Rooms: ${rooms.size} ====== `);
                const arr = Array.from(rooms)
                // const filtered = arr.filter(room => !room[1].has(room[0]))
                for (let i of rooms) {
                    let {projectKey, sessionId} = extractPeerId(i);
                    if (projectKey !== undefined && sessionId !== undefined) {
                        validRooms.push(i);
                    }
                }
                console.log(` ====== Valid Rooms: ${validRooms.length} ====== `);
                if (debug) {
                    for (let item of validRooms) {
                        let connectedSockets = await io.in(item).fetchSockets();
                        console.log(`Room: ${item} connected: ${connectedSockets.length}`)
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 20000, io);
        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            io.adapter(createAdapter(pubClient, subClient));
            console.log("> redis connected.");
            // io.listen(3000);
        });
    },
    handlers: {
        socketsList,
        socketsListByProject,
        socketsLive,
        socketsLiveByProject
    }
};