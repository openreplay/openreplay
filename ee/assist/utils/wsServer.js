const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");

let io;

const getServer = function () {
    return io;
}

let redisClient;
const useRedis = process.env.redis === "true";

if (useRedis) {
    const {createClient} = require("redis");
    const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
    redisClient = createClient({url: REDIS_URL});
    redisClient.on("error", (error) => console.error(`Redis error : ${error}`));
    await redisClient.connect();
}

const doFetchAllSockets = async function () {
    if (useRedis) {
        try {
            console.log('checking cache')
            let cachedResult = await redisClient.get('fetchSocketsResult');
            if (cachedResult) {
                console.log('using cache')
                return JSON.parse(cachedResult);
            }
            console.log('cache miss')
            let result = await io.fetchSockets();
            console.log('setting cache')
            await redisClient.set('fetchSocketsResult', JSON.stringify(result), {EX: 5});
            return result;
        } catch (error) {
            console.error('Error setting value with expiration:', error);
        }
    }
    console.log('no cache')
    return  await io.fetchSockets();
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