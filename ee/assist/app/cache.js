const {logger} = require('./logger');
const Redis = require("ioredis");
const crypto = require("crypto");
const { Mutex } = require("async-mutex");

const REDIS_URL = process.env.REDIS_URL || "localhost:6379";
const redisClient = new Redis(REDIS_URL);
redisClient.on("error", (error) => {
    logger.error(`Redis cache error : ${error}`);
});

function generateNodeID() {
    const buffer = crypto.randomBytes(8);
    return "node_"+buffer.readBigUInt64BE(0).toString();
}

const batchSize = parseInt(process.env.REDIS_BATCH_SIZE) || 1000;
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL_SECONDS) || 25;
const CACHE_REFRESH_INTERVAL = parseInt(process.env.CACHE_REFRESH_INTERVAL_SECONDS) || 5;
const pingInterval = Math.floor(PING_INTERVAL + PING_INTERVAL/2);
const cacheRefreshInterval = Math.floor(CACHE_REFRESH_INTERVAL * 4);
const cacheRefreshIntervalMs = CACHE_REFRESH_INTERVAL * 1000;
let lastCacheUpdateTime = 0;
let cacheRefresher = null;
const nodeID = process.env.HOSTNAME || generateNodeID();

const mutex = new Mutex();
const localCache = {
    addedSessions: new Set(),
    updatedSessions: new Set(),
    refreshedSessions: new Set(),
    deletedSessions: new Set()
};

const sendAssistEvent = async function (payload) {
    try {
        if (typeof payload !== "string") {
            logger.warn("sendAssistEvent received non-string payload. Converting to string.");
            payload = JSON.stringify(payload);
        }
        await redisClient.rpush("assist:stats", payload);
        logger.debug("Assist event sent to Redis: " + payload);
    } catch (error) {
        logger.error(`Failed to send assist event to Redis: ${error}`);
    }
};

const addSession = async function (sessionID) {
    await mutex.runExclusive(() => {
        localCache.addedSessions.add(sessionID);
    });
}

const updateSession = async function (sessionID) {
    await mutex.runExclusive(() => {
        localCache.addedSessions.add(sessionID); // to update the session's cache
        localCache.updatedSessions.add(sessionID); // to add sessionID to the list of recently updated sessions
    });
}

const renewSession = async function (sessionID) {
    await mutex.runExclusive(() => {
        localCache.refreshedSessions.add(sessionID);
    })
}

const removeSession = async function (sessionID) {
    await mutex.runExclusive(() => {
        localCache.deletedSessions.add(sessionID);
    });
}

const updateNodeCache = async function (io) {
    logger.debug('Background refresh triggered');
    try {
        const startTime = performance.now();
        let currStepTs = performance.now();
        const sessionIDs = new Set();
        const result = await io.fetchSockets();
        let toAdd = new Map();
        let toUpdate = [];
        let toRenew = [];
        let toDelete = [];
        await mutex.runExclusive(() => {
            result.forEach((socket) => {
                if (socket.handshake.query.sessId) {
                    const sessID = socket.handshake.query.sessId;
                    if (sessionIDs.has(sessID)) {
                        return;
                    }
                    sessionIDs.add(sessID);
                    if (localCache.addedSessions.has(sessID)) {
                        toAdd.set(sessID, socket.handshake.query.sessionInfo);
                    }
                }
            });
            toUpdate = [...localCache.updatedSessions];
            toRenew = [...localCache.refreshedSessions];
            toDelete = [...localCache.deletedSessions];
            // Clear the local cache
            localCache.addedSessions.clear();
            localCache.updatedSessions.clear();
            localCache.refreshedSessions.clear();
            localCache.deletedSessions.clear();
        })

        // insert new sessions in pipeline
        const toAddArray = Array.from(toAdd.keys());
        for (let i = 0; i < toAddArray.length; i += batchSize) {
            const batch = toAddArray.slice(i, i + batchSize);
            const pipeline = redisClient.pipeline();
            for (const sessionID of batch) {
                pipeline.set(`assist:online_sessions:${sessionID}`, JSON.stringify(toAdd.get(sessionID)), 'EX', pingInterval);
            }
            await pipeline.exec();
        }
        logger.info(`step 1 (toAdd) complete: ${(performance.now() - currStepTs).toFixed(2)}ms, ${toAddArray.length} sockets`);
        currStepTs = performance.now();

        // renew sessions in pipeline
        for (let i = 0; i < toRenew.length; i += batchSize) {
            const batch = toRenew.slice(i, i + batchSize);
            const pipeline = redisClient.pipeline();
            for (const sessionID of batch) {
                pipeline.expire(`assist:online_sessions:${sessionID}`, pingInterval);
            }
            await pipeline.exec();
        }
        logger.info(`step 2 (toRenew) complete: ${(performance.now() - currStepTs).toFixed(2)}ms, ${toRenew.length} sockets`);
        currStepTs = performance.now();

        // delete sessions in pipeline
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);
            const pipeline = redisClient.pipeline();
            for (const sessionID of batch) {
                pipeline.del(`assist:online_sessions:${sessionID}`);
            }
            await pipeline.exec();
        }
        logger.info(`step 3 (toDelete) complete: ${(performance.now() - currStepTs).toFixed(2)}ms, ${toDelete.length} sockets`);
        currStepTs = performance.now();

        // add recently updated sessions
        if (toUpdate.length > 0) {
            await redisClient.sadd('assist:updated_sessions', toUpdate);
        }
        // store the node sessions
        await redisClient.set(`assist:nodes:${nodeID}:sessions`, JSON.stringify(Array.from(sessionIDs)), 'EX', cacheRefreshInterval);
        logger.info(`step 4 (full list + updated) complete: ${(performance.now() - currStepTs).toFixed(2)}ms, ${toUpdate.length} sockets`);

        const duration = performance.now() - startTime;
        logger.info(`Background refresh complete: ${duration.toFixed(2)}ms, ${result.length} sockets`);
    } catch (error) {
        logger.error(`Background refresh error: ${error}`);
    }
}

let isFlushing = false;

function startCacheRefresher(io) {
    if (cacheRefresher) clearInterval(cacheRefresher);

    cacheRefresher = setInterval(async () => {
        if (isFlushing) {
            logger.warn("Skipping tick: flush in progress");
            return;
        }

        const now = Date.now();
        if (now - lastCacheUpdateTime < cacheRefreshIntervalMs) {
            return;
        }

        isFlushing = true;
        try {
            await updateNodeCache(io);
            lastCacheUpdateTime = Date.now();
        } catch (err) {
            logger.error(`Tick error: ${err}`);
        } finally {
            isFlushing = false;
        }
    }, cacheRefreshIntervalMs / 2);
}

module.exports = {
    sendAssistEvent,
    addSession,
    updateSession,
    renewSession,
    removeSession,
    startCacheRefresher,
}