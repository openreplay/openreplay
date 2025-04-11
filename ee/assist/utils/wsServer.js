const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");
const {logger} = require('./logger');

let io;
const getServer = function () {return io;}

const useRedis = process.env.redis === "true";
let inMemorySocketsCache = [];
let lastCacheUpdateTime = 0;
const CACHE_REFRESH_INTERVAL = parseInt(process.env.cacheRefreshInterval) || 5000;

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

const processSocketsList = function (sockets) {
    let res = []
    for (let socket of sockets) {
        let {handshake} = socket;
        res.push({handshake});
    }
    return res
}

const fetchSockets = async function (roomID) {
    if (!io) {
        return [];
    }
    if (!roomID) {
        return await doFetchAllSockets();
    }
    return await io.in(roomID).fetchSockets();
}

const createSocketIOServer = function (server, prefix) {
    if (io) {
        return io;
    }
    if (process.env.uws !== "true") {
        io = _io(server, {
            maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"],
                credentials: true
            },
            path: (prefix ? prefix : '') + '/socket',
            ...getCompressionConfig()
        });
    } else {
        io = new _io.Server({
            maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"],
                credentials: true
            },
            path: (prefix ? prefix : '') + '/socket',
            ...getCompressionConfig()
        });
        io.attachApp(server);
    }
    startCacheRefresher();
    return io;
}

module.exports = {
    createSocketIOServer,
    getServer,
    fetchSockets,
}