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

const pingInterval = parseInt(process.env.PING_INTERVAL) || 25000;
const CACHE_REFRESH_INTERVAL = parseInt(process.env.cacheRefreshInterval) || 10000;
let lastCacheUpdateTime = 0;
let cacheRefresher = null;
const nodeID = process.env.HOSTNAME || generateNodeID();

const addSessionToCache =  async function (sessionID, sessionData) {
    try {
        await redisClient.set(`active_sessions:${sessionID}`, JSON.stringify(sessionData), 'EX', pingInterval*2);
        logger.debug(`Session ${sessionID} stored in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

const renewSession = async function (sessionID){
    try {
        await redisClient.expire(`active_sessions:${sessionID}`, pingInterval*2);
        logger.debug(`Session ${sessionID} renewed in Redis`);
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

const setNodeSessions = async function (nodeID, sessionIDs) {
    try {
        await redisClient.set(`node:${nodeID}:sessions`, JSON.stringify(sessionIDs), 'EX', CACHE_REFRESH_INTERVAL*2);
        logger.debug(`Node ${nodeID} sessions stored in Redis`);
    } catch (error) {
        logger.error(error);
    }
}

function startCacheRefresher(io) {
    if (cacheRefresher) clearInterval(cacheRefresher);

    cacheRefresher = setInterval(async () => {
        const now = Date.now();
        if (now - lastCacheUpdateTime < CACHE_REFRESH_INTERVAL) {
            return;
        }
        logger.debug('Background refresh triggered');
        try {
            const startTime = performance.now();
            const sessionIDs = new Set();
            const result = await io.fetchSockets();
            result.forEach((r) => {
                if (r.handshake.query.sessionID) {
                    sessionIDs.add(r.handshake.query.sessionID);
                }
            })
            await setNodeSessions(nodeID, Array.from(sessionIDs));
            lastCacheUpdateTime = now;
            const duration = performance.now() - startTime;
            logger.info(`Background refresh complete: ${duration}ms, ${result.length} sockets`);
        } catch (error) {
            logger.error(`Background refresh error: ${error}`);
        }
    }, CACHE_REFRESH_INTERVAL / 2);
}

module.exports = {
    addSessionToCache,
    renewSession,
    getSessionFromCache,
    removeSessionFromCache,
    startCacheRefresher,
}