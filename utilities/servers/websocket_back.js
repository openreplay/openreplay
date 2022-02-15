const _io = require('socket.io');
const express = require('express');
const uaParser = require('ua-parser-js');
const geoip2Reader = require('@maxmind/geoip2-node').Reader;
var {extractPeerId} = require('./peerjs-server');
var wsRouter = express.Router();
const IDENTITIES = {agent: 'agent', session: 'session'};
const NEW_AGENT = "NEW_AGENT";
const NO_AGENTS = "NO_AGENT";
const AGENT_DISCONNECT = "AGENT_DISCONNECTED";
const AGENTS_CONNECTED = "AGENTS_CONNECTED";
const NO_SESSIONS = "SESSION_DISCONNECTED";
const SESSION_ALREADY_CONNECTED = "SESSION_ALREADY_CONNECTED";
// const wsReconnectionTimeout = process.env.wsReconnectionTimeout | 10 * 1000;

let io;
let debug = process.env.debug === "1" || false;
wsRouter.get(`/${process.env.S3_KEY}/sockets-list`, function (req, res) {
    debug && console.log("[WS]looking for all available sessions");
    let liveSessions = {};
    for (let peerId of io.sockets.adapter.rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            liveSessions[projectKey].push(sessionId);
        }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": liveSessions}));
});
wsRouter.get(`/${process.env.S3_KEY}/sockets-list/:projectKey`, function (req, res) {
    debug && console.log(`[WS]looking for available sessions for ${req.params.projectKey}`);
    let liveSessions = {};
    for (let peerId of io.sockets.adapter.rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === req.params.projectKey) {
            liveSessions[projectKey] = liveSessions[projectKey] || [];
            liveSessions[projectKey].push(sessionId);
        }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": liveSessions[req.params.projectKey] || []}));
});

wsRouter.get(`/${process.env.S3_KEY}/sockets-live`, async function (req, res) {
    debug && console.log("[WS]looking for all available LIVE sessions");
    let liveSessions = {};
    for (let peerId of io.sockets.adapter.rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey !== undefined) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                }
            }
        }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": liveSessions}));
});
wsRouter.get(`/${process.env.S3_KEY}/sockets-live/:projectKey`, async function (req, res) {
    debug && console.log(`[WS]looking for available LIVE sessions for ${req.params.projectKey}`);
    let liveSessions = {};
    for (let peerId of io.sockets.adapter.rooms.keys()) {
        let {projectKey, sessionId} = extractPeerId(peerId);
        if (projectKey === req.params.projectKey) {
            let connected_sockets = await io.in(peerId).fetchSockets();
            for (let item of connected_sockets) {
                if (item.handshake.query.identity === IDENTITIES.session) {
                    liveSessions[projectKey] = liveSessions[projectKey] || [];
                    liveSessions[projectKey].push(item.handshake.query.sessionInfo);
                }
            }
        }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": liveSessions[req.params.projectKey] || []}));
});

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
    start: (server) => {
        io = _io(server, {
            maxHttpBufferSize: 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"]
            },
            path: '/socket'
        });

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

            socket.onAny(async (eventName, ...args) => {
                socket.lastMessageReceivedAt = Date.now();
                if (socket.identity === IDENTITIES.session) {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to room:${socket.peerId}, members: ${io.sockets.adapter.rooms.get(socket.peerId).size}`);
                    socket.to(socket.peerId).emit(eventName, args[0]);
                } else {
                    debug && console.log(`received event:${eventName}, from:${socket.identity}, sending message to session of room:${socket.peerId}, members:${io.sockets.adapter.rooms.get(socket.peerId).size}`);
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
        setInterval((io) => {
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
    }
};