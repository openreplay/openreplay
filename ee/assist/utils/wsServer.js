const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");
const {logger} = require('./logger');

let io;

const useRedis = process.env.redis === "true";
const useStickySessions = process.env.stickySessions === "true";
let inMemorySocketsCache = [];
let lastCacheUpdateTime = 0;
const CACHE_REFRESH_INTERVAL = parseInt(process.env.cacheRefreshInterval) || 5000;

let redisClient;
if (useRedis) {
    const {createClient} = require("redis");
    const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
    redisClient = createClient({url: REDIS_URL});
    redisClient.on("error", (error) => logger.error(`Redis cache error : ${error}`));
    void redisClient.connect();
}

const addSessionToCache =  async function (sessionID, sessionData) {
    try {
        await redisClient.set(`active_sessions:${sessionID}`, JSON.stringify(sessionData), 'EX', 3600); // 60 minutes
        logger.debug(`Session ${sessionID} stored in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const getSessionFromCache = async function (sessionID) {
    try {
        const sessionData = await redisClient.get(`active_sessions:${sessionID}`);
        if (sessionData) {
            logger.debug(`Session ${sessionID} retrieved from Redis`);
            return JSON.parse(sessionData);
        }
        return null;
    } catch (error) {
        logger.error(error);
        return null;
    }
}

const removeSessionFromCache = async function (sessionID) {
    try {
        await redisClient.del(`active_sessions:${sessionID}`);
        logger.debug(`Session ${sessionID} removed from Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const doFetchAllSockets = async function () {
    if (useRedis) {
        const now = Date.now();
        logger.info(`Using in-memory cache (age: ${now - lastCacheUpdateTime}ms)`);
        return inMemorySocketsCache;
    } else {
        try {
            return await io.fetchSockets();
        } catch (error) {
            logger.error('Error fetching sockets:', error);
            return [];
        }
    }
}

// Background refresher that runs independently of requests
let cacheRefresher = null;
function startCacheRefresher() {
    if (cacheRefresher) clearInterval(cacheRefresher);

    cacheRefresher = setInterval(async () => {
        const now = Date.now();
        // Only refresh if cache is stale
        if (now - lastCacheUpdateTime >= CACHE_REFRESH_INTERVAL) {
            logger.debug('Background refresh triggered');
            try {
                const startTime = performance.now();
                const result = await io.fetchSockets();
                inMemorySocketsCache = result;
                lastCacheUpdateTime = now;
                const duration = performance.now() - startTime;
                logger.info(`Background refresh complete: ${duration}ms, ${result.length} sockets`);
            } catch (error) {
                logger.error(`Background refresh error: ${error}`);
            }
        }
    }, CACHE_REFRESH_INTERVAL / 2);
}

function sendFrom(from, to, eventName, ...data) {
    if (useStickySessions) {
        from.local.to(to).emit(eventName, ...data);
    } else {
        from.to(to).emit(eventName, ...data);
    }
}

function sendTo(to, eventName, ...data) {
    sendFrom(io, to, eventName, ...data);
}

const fetchSockets = async function (roomID, all=false) {
    if (!io) {
        return [];
    }
    if (!roomID) {
        return await doFetchAllSockets();
    }
    try {
        if (useStickySessions && !all) {
            return await io.local.in(roomID).fetchSockets();
        } else {
            return await io.in(roomID).fetchSockets();
        }
    } catch (error) {
        logger.error('Error fetching sockets:', error);
        return [];
    }
}

const createSocketIOServer = function (server, prefix) {
    if (io) {
        return io;
    }

    // Common options for both initialization methods
    const options = {
        maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT"],
            credentials: true
        },
        path: (prefix ? prefix : '') + '/socket',
        ...getCompressionConfig()
    };

    if (process.env.uws !== "true") {
        io = _io(server, options);
    } else {
        io = new _io.Server(options);
        io.attachApp(server);
    }

    io.engine.on("headers", (headers) => {
        headers["x-host-id"] = process.env.HOSTNAME || "unknown";
    });

    if (useRedis) {
        startCacheRefresher();
    }
    return io;
}

module.exports = {
    createSocketIOServer,
    sendTo,
    sendFrom,
    fetchSockets,
    addSessionToCache,
    getSessionFromCache,
    removeSessionFromCache,
}