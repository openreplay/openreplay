const { App } = require('uWebSockets.js');
const { Server } = require('socket.io');
const { logger } = require("./app/logger");
const { authorizer } = require("./app/assist");
const { onConnect, setSocketIOServer } = require("./app/socket");
const { startCacheRefresher } = require("./app/cache");

const app = App();
const pingInterval = parseInt(process.env.PING_INTERVAL) || 25000;

const getCompressionConfig = function () {
    // WS: The theoretical overhead per socket is 19KB (11KB for compressor and 8KB for decompressor)
    let perMessageDeflate = false;
    if (process.env.COMPRESSION === "true") {
        logger.info(`WS compression: enabled`);
        perMessageDeflate = {
            zlibDeflateOptions: {
                windowBits: 10,
                memLevel: 1
            },
            zlibInflateOptions: {
                windowBits: 10
            }
        }
    } else {
        logger.info(`WS compression: disabled`);
    }
    return {
        perMessageDeflate: perMessageDeflate,
        clientNoContextTakeover: true
    };
}

const io = new Server({
    maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
    pingInterval: pingInterval, // Will use it for cache invalidation
    cors: {
        origin: "*", // Allow connections from any origin (for development)
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/socket',
    ...getCompressionConfig()
});

io.use(async (socket, next) => await authorizer.check(socket, next));
io.on('connection', (socket) => onConnect(socket));
io.attachApp(app);
setSocketIOServer(io);

const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT) || 9001;
app.listen(PORT, (token) => {
    if (token) {
        console.log(`Server running at http://${HOST}:${PORT}`);
    } else {
        console.log(`Failed to listen on port ${PORT}`);
    }
});
startCacheRefresher(io);

process.on('uncaughtException', err => {
    logger.error(`Uncaught Exception: ${err}`);
});