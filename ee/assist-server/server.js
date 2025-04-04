const { App } = require('uWebSockets.js');
const { Server } = require('socket.io');
const { logger } = require("./app/logger");
const { authorizer } = require("./app/assist");
const { onConnect, setSocketIOServer } = require("./app/socket");
const { startCacheRefresher } = require("./app/cache");

// Create uWebSockets.js app
const app = App();
const prefix = process.env.PREFIX || process.env.prefix || `/assist`;
const pingInterval = parseInt(process.env.PING_INTERVAL) || 5000;

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

// Create a Socket.IO server with uWebSockets.js adapter
const io = new Server({
    maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
    pingInterval: pingInterval, // Will use it for cache invalidation
    cors: {
        origin: "*", // Allow connections from any origin (for development)
        methods: ["GET", "POST"],
        credentials: true
    },
    path: (prefix ? prefix : '') + '/socket',
    ...getCompressionConfig()
});

// Middleware for Socket.IO to check authorization
io.use(async (socket, next) => await authorizer.check(socket, next));
// Socket.IO connection handler
io.on('connection', (socket) => onConnect(socket));
// Attach Socket.IO to uWebSockets.js
io.attachApp(app);
io.engine.on("headers", (headers) => {
    headers["x-host-id"] = process.env.HOSTNAME || "unknown";
});
setSocketIOServer(io);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, (token) => {
    if (token) {
        console.log(`Server running at http://localhost:${PORT}`);
    } else {
        console.log(`Failed to listen on port ${PORT}`);
    }
});

startCacheRefresher(io);

// Error handling for uncaught exceptions
process.on('uncaughtException', err => {
    logger.error(`Uncaught Exception: ${err}`);
});