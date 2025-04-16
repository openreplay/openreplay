const {logger} = require('./logger');
const {createClient} = require("redis");
const crypto = require("crypto");

let redisClient;
const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
redisClient = createClient({url: REDIS_URL});
redisClient.on("error", (error) => logger.error(`Redis cache error : ${error}`));
void redisClient.connect();

function generateNodeID() {
    const buffer = crypto.randomBytes(8);
    return "node_"+buffer.readBigUInt64BE(0).toString();
}

const PING_INTERVAL = parseInt(process.env.PING_INTERVAL_SECONDS) || 25;
const CACHE_REFRESH_INTERVAL = parseInt(process.env.CACHE_REFRESH_INTERVAL_SECONDS) || 10;
const pingInterval = Math.floor(PING_INTERVAL + PING_INTERVAL/2);
const cacheRefreshInterval = Math.floor(CACHE_REFRESH_INTERVAL + CACHE_REFRESH_INTERVAL/2);
const cacheRefreshIntervalMs = CACHE_REFRESH_INTERVAL * 1000;
let lastCacheUpdateTime = 0;
let cacheRefresher = null;
const nodeID = process.env.HOSTNAME || generateNodeID();

const addSessionToCache =  async function (sessionID, sessionData) {
    try {
        await redisClient.set(`assist:online_sessions:${sessionID}`, JSON.stringify(sessionData), {EX: pingInterval});
        logger.debug(`Session ${sessionID} stored in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const renewSession = async function (sessionID){
    try {
        await redisClient.expire(`assist:online_sessions:${sessionID}`, pingInterval);
        logger.debug(`Session ${sessionID} renewed in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const removeSessionFromCache = async function (sessionID) {
    try {
        await redisClient.del(`assist:online_sessions:${sessionID}`);
        logger.debug(`Session ${sessionID} removed from Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const setNodeSessions = async function (nodeID, sessionIDs) {
    try {
        await redisClient.set(`assist:nodes:${nodeID}:sessions`, JSON.stringify(sessionIDs), {EX: cacheRefreshInterval});
        logger.debug(`Node ${nodeID} sessions stored in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

function startCacheRefresher(io) {
    if (cacheRefresher) clearInterval(cacheRefresher);

    cacheRefresher = setInterval(async () => {
        const now = Date.now();
        if (now - lastCacheUpdateTime < cacheRefreshIntervalMs) {
            return;
        }
        logger.debug('Background refresh triggered');
        try {
            const startTime = performance.now();
            const sessionIDs = new Set();
            const result = await io.fetchSockets();
            result.forEach((socket) => {
                if (socket.handshake.query.sessId) {
                    sessionIDs.add(socket.handshake.query.sessId);
                }
            })
            await setNodeSessions(nodeID, Array.from(sessionIDs));
            lastCacheUpdateTime = now;
            const duration = performance.now() - startTime;
            logger.info(`Background refresh complete: ${duration}ms, ${result.length} sockets`);
        } catch (error) {
            logger.error(`Background refresh error: ${error}`);
        }
    }, cacheRefreshIntervalMs / 2);
}

module.exports = {
    addSessionToCache,
    renewSession,
    removeSessionFromCache,
    startCacheRefresher,
}