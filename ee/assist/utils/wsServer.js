const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");
const {logger} = require('./logger');
const {Mutex} = require('async-mutex');

let io;
const getServer = function () {return io;}

const useRedis = process.env.redis === "true";
const cacheExpiration = parseInt(process.env.cacheExpiration) || 10; // in seconds
const mutexTimeout = parseInt(process.env.mutexTimeout) || 10000; // in milliseconds
const fetchMutex = new Mutex();
const fetchAllSocketsResultKey = 'fetchSocketsResult';
let lastKnownResult = [];

// Cache layer
let redisClient;
if (useRedis) {
    const {createClient} = require("redis");
    const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
    redisClient = createClient({url: REDIS_URL});
    redisClient.on("error", (error) => logger.error(`Redis error : ${error}`));
    void redisClient.connect();
    logger.info(`Using Redis for cache: ${REDIS_URL}`);
}

const processSocketsList = function (sockets) {
    let res = []
    for (let socket of sockets) {
        let {handshake} = socket;
        res.push({handshake});
    }
    return res
}

const doFetchAllSockets = async function () {
    if (useRedis) {
        try {
            let cachedResult = await redisClient.get(fetchAllSocketsResultKey);
            if (cachedResult) {
                return JSON.parse(cachedResult);
            }
            return await fetchMutex.runExclusive(async () => {
                try {
                    cachedResult = await redisClient.get(fetchAllSocketsResultKey);
                    if (cachedResult) {
                        return JSON.parse(cachedResult);
                    }
                    let result = await io.fetchSockets();
                    let cachedString = JSON.stringify(processSocketsList(result));
                    lastKnownResult = result;
                    await redisClient.set(fetchAllSocketsResultKey, cachedString, {EX: cacheExpiration});
                    return result;
                } catch (err) {
                    logger.error('Error fetching new sockets:', err);
                    return lastKnownResult;
                }
            }, mutexTimeout);
        } catch (error) {
            logger.error('Error fetching cached sockets:', error);
            return lastKnownResult;
        }
    }
    try {
        return await io.fetchSockets();
    } catch (error) {
        logger.error('Error fetching sockets:', error);
        return lastKnownResult;
    }
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
    return io;
}

module.exports = {
    createSocketIOServer,
    getServer,
    fetchSockets,
}